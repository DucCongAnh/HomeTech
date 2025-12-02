package com.hometech.hometech.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import com.hometech.hometech.Repository.*;
import com.hometech.hometech.dto.PreviewOrderResponse;
import com.hometech.hometech.model.*;
import org.springframework.stereotype.Service;

import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.enums.PaymentMethod;

@Service
public class OrderService {

    private static final String PLACEHOLDER_VALUE = "chưa cập nhật";

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final CartItemRepository cartRepo;
    private final CustomerRepository customerRepo;
    private final NotifyService notifyService;
    private final AddressRepository addressRepo;
    private final VoucherRepository voucherRepo;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;


    public OrderService(OrderRepository orderRepo, OrderItemRepository orderItemRepo,
                        CartItemRepository cartRepo, CustomerRepository customerRepo,
                        NotifyService notifyService,
                        AddressRepository addressRepo,
                        VoucherRepository voucherRepo,
                        PaymentRepository paymentRepository,
                        ProductRepository productRepository) {
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.cartRepo = cartRepo;
        this.customerRepo = customerRepo;
        this.notifyService = notifyService;
        this.addressRepo = addressRepo;
        this.voucherRepo=voucherRepo;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
    }

    // 🟢 Tạo đơn hàng từ giỏ hàng của user cụ thể
    public Order createOrder(Long userId, String code, PaymentMethod paymentMethod, Long productId, Integer quantity) {
        // (1) Customer
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // (2) Address
        Address address = addressRepo.findFirstByCustomer_IdOrderByIdAsc(customer.getId())
                .orElseThrow(() -> new RuntimeException("Khách hàng chưa có địa chỉ giao hàng. Vui lòng cập nhật hồ sơ trước khi đặt hàng."));
        validateAddress(address);
        validateCustomerContact(customer);

        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setFullName(customer.getFullName());
        orderInfo.setEmail(resolveCustomerEmail(customer));
        orderInfo.setPhone(customer.getPhone());
        orderInfo.setStreet(address.getStreet());
        orderInfo.setWard(address.getWard());
        orderInfo.setDistrict(address.getDistrict());
        orderInfo.setCity(address.getCity());

        boolean isBuyNow = productId != null;

        // (3) Cart / Buy Now source
        List<CartItem> cartItems = new ArrayList<>();
        if (!isBuyNow) {
            if (customer.getCart() == null) {
                throw new RuntimeException("Customer cart not found");
            }

            cartItems = cartRepo.findByCart(customer.getCart());
            if (cartItems.isEmpty()) {
                throw new RuntimeException("Giỏ hàng trống!");
            }
        }

        // (4) Tính tổng
        double subtotal = 0;
        List<OrderItem> orderItems = new ArrayList<>();

        List<Product> productsToUpdate = new ArrayList<>();

        if (isBuyNow) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại."));

            int purchaseQuantity = (quantity != null && quantity > 0) ? quantity : 1;
            if (purchaseQuantity <= 0) {
                throw new RuntimeException("Số lượng sản phẩm phải lớn hơn 0");
            }

            if (product.getStock() < purchaseQuantity) {
                throw new RuntimeException(String.format("Sản phẩm %s chỉ còn %d sản phẩm trong kho.",
                        product.getName(), product.getStock()));
            }

            double itemTotal = product.getPrice() * purchaseQuantity;
            subtotal += itemTotal;

            OrderItem oi = new OrderItem();
            oi.setProduct(product);
            oi.setQuantity(purchaseQuantity);
            oi.setPrice(product.getPrice());
            orderItems.add(oi);

            product.setStock(product.getStock() - purchaseQuantity);
            product.setSoldCount(product.getSoldCount() + purchaseQuantity);

            if (product.getStock() <= 0) {
                product.setHidden(true);
            }

            productsToUpdate.add(product);
        } else {
            for (CartItem c : cartItems) {
                Product product = productRepository.findById(c.getProduct().getId())
                        .orElseThrow(() -> new RuntimeException("Sản phẩm trong giỏ không còn tồn tại."));

                if (product.getStock() < c.getQuantity()) {
                    throw new RuntimeException(String.format("Sản phẩm %s chỉ còn %d sản phẩm trong kho.",
                            product.getName(), product.getStock()));
                }

                double itemTotal = product.getPrice() * c.getQuantity();
                subtotal += itemTotal;

                OrderItem oi = new OrderItem();
                oi.setProduct(product);
                oi.setQuantity(c.getQuantity());
                oi.setPrice(product.getPrice());
                orderItems.add(oi);

                product.setStock(product.getStock() - c.getQuantity());
                product.setSoldCount(product.getSoldCount() + c.getQuantity());
                
                // Tự động ẩn sản phẩm khi tồn kho = 0
                if (product.getStock() <= 0) {
                    product.setHidden(true);
                }
                
                productsToUpdate.add(product);
            }
        }

        // (5) Áp dụng voucher nếu có
        Voucher voucher = null;
        double discount = 0;
        double finalTotal = subtotal;

        if (code != null && !code.isBlank()) {

            voucher = voucherRepo.findByCode(code)
                    .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));

            // Check status
            if (!voucher.isActive())
                throw new RuntimeException("Voucher không hoạt động");

            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(voucher.getStartDate()) || now.isAfter(voucher.getEndDate()))
                throw new RuntimeException("Voucher đã hết hạn");

            if (subtotal < voucher.getMinOrderValue())
                throw new RuntimeException("Đơn hàng chưa đủ điều kiện áp dụng voucher");

            if (voucher.getUsedCount() >= voucher.getUsageLimit())
                throw new RuntimeException("Voucher đã đạt số lần sử dụng tối đa");

            // Tính giảm
            if (voucher.getDiscountPercent() != null)
                discount += subtotal * (voucher.getDiscountPercent() / 100);

            if (voucher.getDiscountAmount() != null)
                discount += voucher.getDiscountAmount();

            // Không vượt tổng
            discount = Math.min(discount, subtotal);

            finalTotal = subtotal - discount;

            // Update số lần dùng
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepo.save(voucher);
        }

        // (6) Tạo Order
        Order order = new Order();
        order.setCustomer(customer);
        order.setOrderInfo(orderInfo);
        order.setTotalAmount(finalTotal);
        order.setStatus(OrderStatus.WAITING_CONFIRMATION);
        order.setCreatedAt(LocalDateTime.now());
        order.setVoucher(voucher);   // ⬅ ⬅ Gắn voucher vào Order
        order.setPaymentMethod(paymentMethod != null ? paymentMethod : PaymentMethod.COD);
        order.setItems(orderItems);
        order.setVoucherCodeSnapshot(voucher != null ? voucher.getCode() : null);
        order.setDiscountAmount(discount);

        orderItems.forEach(i -> i.setOrder(order));

        // (7) Lưu DB
        orderRepo.save(order);
        orderItemRepo.saveAll(orderItems);
        productRepository.saveAll(productsToUpdate);

        Payment payment = order.getPayment();
        if (payment == null) {
            payment = new Payment();
        }
        payment.setOrder(order);
        payment.setAmount(finalTotal);
        PaymentMethod method = paymentMethod != null ? paymentMethod : PaymentMethod.COD;
        payment.setMethod(method.name());
        payment.setStatus(method == PaymentMethod.COD ? "PENDING" : "AWAITING_PAYMENT");
        paymentRepository.save(payment);
        order.setPayment(payment);

        int earnedPoints = (int) (finalTotal / 10_000);
        if (earnedPoints > 0) {
            customer.setLoyaltyPoints(customer.getLoyaltyPoints() + earnedPoints);
            customerRepo.save(customer);
        }

        try {
            notifyService.createNotification(customer.getId(),
                    String.format("Đơn hàng #%d đã được tạo thành công", order.getId()),
                    "ORDER_CREATED",
                    order.getId());
            String customerName = getCustomerDisplayName(customer);
            notifyService.notifyAdmins(
                    String.format("Đơn hàng mới #%d từ %s", order.getId(), customerName),
                    "ORDER_CREATED",
                    order.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send order creation notification: " + e.getMessage());
        }

        // (8) Xóa cart sau khi tạo đơn (chỉ áp dụng cho đặt hàng từ giỏ)
        if (!isBuyNow && !cartItems.isEmpty()) {
            cartRepo.deleteAll(cartItems);
        }

        return order;
    }

    public PreviewOrderResponse previewOrder(Long userId, String voucherCode, Long productId, Integer quantity) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        boolean isBuyNow = productId != null;

        double subtotal;

        if (isBuyNow) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại"));

            int purchaseQuantity = (quantity != null && quantity > 0) ? quantity : 1;
            if (purchaseQuantity <= 0) {
                throw new RuntimeException("Số lượng sản phẩm phải lớn hơn 0");
            }

            if (product.getStock() < purchaseQuantity) {
                throw new RuntimeException(String.format("Sản phẩm %s chỉ còn %d sản phẩm trong kho.",
                        product.getName(), product.getStock()));
            }

            subtotal = product.getPrice() * purchaseQuantity;
        } else {
            List<CartItem> cartItems = cartRepo.findByCart(customer.getCart());
            if (cartItems.isEmpty()) {
                throw new RuntimeException("Giỏ hàng trống");
            }

            subtotal = cartItems.stream()
                    .mapToDouble(c -> c.getProduct().getPrice() * c.getQuantity())
                    .sum();
        }

        double discount = 0;
        boolean voucherValid = false;
        String message = "Không sử dụng voucher";

        if (voucherCode != null && !voucherCode.isBlank()) {
            try {
                Voucher voucher = voucherRepo.findByCode(voucherCode)
                        .orElseThrow(() -> new RuntimeException("Voucher không hợp lệ"));

                validateVoucher(voucher, subtotal);
                discount = calculateDiscount(subtotal, voucher);

                voucherValid = true;
                message = "Áp dụng voucher thành công";

            } catch (RuntimeException e) {
                voucherValid = false;
                message = e.getMessage();
            }
        }

        double finalTotal = subtotal - discount;
        if (finalTotal < 0) finalTotal = 0;

        return new PreviewOrderResponse(
                subtotal,
                discount,
                finalTotal,
                voucherValid,
                message
        );
    }
    private void validateVoucher(Voucher voucher, double subtotal) {
        if (!voucher.isActive()) throw new RuntimeException("Voucher không còn hiệu lực");
        if (voucher.getUsageLimit() != null &&
                voucher.getUsedCount() >= voucher.getUsageLimit())
            throw new RuntimeException("Voucher đã hết lượt sử dụng");
        if (subtotal < voucher.getMinOrderValue())
            throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu");
        if (voucher.getStartDate().isAfter(LocalDateTime.now()) ||
                voucher.getEndDate().isBefore(LocalDateTime.now()))
            throw new RuntimeException("Voucher đã hết hạn");
    }
    private double calculateDiscount(double subtotal, Voucher voucher) {
        if (voucher.getDiscountPercent() != null) {
            return subtotal * voucher.getDiscountPercent() / 100;
        }
        if (voucher.getDiscountAmount() != null) {
            return voucher.getDiscountAmount();
        }
        return 0;
    }




    // 🟡 Cập nhật trạng thái đơn hàng
    public Order updateStatus(long orderId, OrderStatus newStatus) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng ID: " + orderId));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        Order savedOrder = orderRepo.save(order);

        // 🔔 Thông báo khi trạng thái thay đổi
        if (oldStatus != newStatus && order.getCustomer() != null ) {
            try {
                Long userId = order.getCustomer().getId();
                String message = String.format("Đơn hàng #%d %s", orderId, getStatusMessage(newStatus));
                notifyService.createNotification(userId, message, "ORDER_STATUS", orderId);
            } catch (Exception e) {
                System.err.println("❌ Failed to send notification: " + e.getMessage());
            }
        }
        try {
            notifyService.notifyAdmins(
                    String.format("Đơn hàng #%d đã được cập nhật sang %s", orderId, newStatus),
                    "ORDER_STATUS_ADMIN",
                    orderId);
        } catch (Exception e) {
            System.err.println("❌ Failed to send admin order update notification: " + e.getMessage());
        }

        return savedOrder;
    }

    private String getStatusMessage(OrderStatus status) {
        switch (status) {
            case WAITING_CONFIRMATION:
                return "đang chờ xác nhận";
            case CONFIRMED:
                return "đã được xác nhận";
            case SHIPPED:
                return "đang được giao";
            case COMPLETED:
                return "đã giao thành công 🎉";
            case CANCELLED:
                return "đã bị hủy";
            default:
                return "đã thay đổi trạng thái";
        }
    }

    public List<Order> getAllOrders() {
        return orderRepo.findAll();
    }

    public List<Order> getOrdersByUserId(Long userId) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        return orderRepo.findByCustomer(customer);
    }

    public List<Order> getOrdersByUserIdAndStatus(Long userId, OrderStatus orderStatus) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        return orderRepo.findByCustomerAndStatus(customer, orderStatus);
    }

    public List<Order> getOrdersByStatus(OrderStatus orderStatus) {
        return orderRepo.findByStatus(orderStatus);
    }

    public Order getOrderById(long id) {
        return orderRepo.findById(id).orElse(null);
    }

    public boolean canCancelOrder(long orderId) {
        Order order = orderRepo.findById(orderId).orElse(null);
        if (order == null) return false;

        if (order.getStatus() != OrderStatus.WAITING_CONFIRMATION) return false;

        Duration diff = Duration.between(order.getCreatedAt(), LocalDateTime.now());
        return diff.toMinutes() <= 30; // chỉ cho phép hủy trong 30 phút đầu
    }

    public Order cancelOrderByUser(Long userId, long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng ID: " + orderId));

        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (!order.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("Unauthorized: Đơn hàng không thuộc về user này");
        }

        if (!canCancelOrder(orderId)) {
            throw new RuntimeException("Không thể hủy đơn hàng. Chỉ có thể hủy trong 30 phút đầu và trạng thái chờ xác nhận.");
        }

        // Hoàn trả tồn kho trước khi hủy đơn
        restoreStockFromCancelledOrder(order);

        order.setStatus(OrderStatus.CANCELLED);
        Order savedOrder = orderRepo.save(order);

        try {
            String message = String.format("Đơn hàng #%d đã được hủy thành công", orderId);
            notifyService.createNotification(userId, message, "ORDER_CANCELLED", orderId);
            notifyService.notifyAdmins(
                    String.format("Khách hàng %s đã hủy đơn #%d", getCustomerDisplayName(customer), orderId),
                    "ORDER_CANCELLED",
                    orderId);
        } catch (Exception e) {
            System.err.println("❌ Failed to send cancellation notification: " + e.getMessage());
        }

        return savedOrder;
    }

    public Order cancelOrderByAdmin(long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng ID: " + orderId));

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new RuntimeException("Không thể hủy đơn hàng đã hoàn thành");
        }

        // Hoàn trả tồn kho trước khi hủy đơn
        restoreStockFromCancelledOrder(order);

        order.setStatus(OrderStatus.CANCELLED);
        Order savedOrder = orderRepo.save(order);

        if (order.getCustomer() != null ) {
            try {
                Long userId = order.getCustomer().getId();
                String message = String.format("Đơn hàng #%d đã bị hủy bởi quản trị viên", orderId);
                notifyService.createNotification(userId, message, "ORDER_CANCELLED", orderId);
            } catch (Exception e) {
                System.err.println("❌ Failed to send admin cancellation notification: " + e.getMessage());
            }
        }
        try {
            notifyService.notifyAdmins(
                    String.format("Đơn hàng #%d đã bị hủy bởi quản trị viên", orderId),
                    "ORDER_CANCELLED_ADMIN",
                    orderId);
        } catch (Exception e) {
            System.err.println("❌ Failed to send admin cancellation broadcast: " + e.getMessage());
        }

        return savedOrder;
    }

    public Map<OrderStatus, Long> countOrdersByStatusForUser(Long userId) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

        List<Order> orders = orderRepo.findByCustomer(customer);
        Map<OrderStatus, Long> stats = new EnumMap<>(OrderStatus.class);

        for (OrderStatus status : OrderStatus.values()) stats.put(status, 0L);
        for (Order o : orders) stats.put(o.getStatus(), stats.get(o.getStatus()) + 1);

        return stats;
    }

    public Map<OrderStatus, Long> countAllOrdersByStatus() {
        List<Order> orders = orderRepo.findAll();
        Map<OrderStatus, Long> stats = new EnumMap<>(OrderStatus.class);

        for (OrderStatus status : OrderStatus.values()) stats.put(status, 0L);
        for (Order o : orders) stats.put(o.getStatus(), stats.get(o.getStatus()) + 1);

        return stats;
    }

    private String getCustomerDisplayName(Customer customer) {
        if (customer == null) return "khách hàng";
        if (customer.getFullName() != null && !customer.getFullName().isBlank()) {
            return customer.getFullName();
        }
        if (customer.getAccount() != null && customer.getAccount().getUsername() != null) {
            return customer.getAccount().getUsername();
        }
        return "khách hàng";
    }

    public Map<String, Object> getExpensesByDateRange(Long userId, String startDateStr, String endDateStr, String groupBy) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Parse dates
        LocalDateTime startDate = LocalDateTime.parse(startDateStr + "T00:00:00");
        LocalDateTime endDate = LocalDateTime.parse(endDateStr + "T23:59:59");

        // Get all orders for this user
        List<Order> allOrders = orderRepo.findByCustomer(customer);

        // Filter orders by date range and exclude cancelled orders
        List<Order> filteredOrders = allOrders.stream()
                .filter(order -> order.getCreatedAt() != null)
                .filter(order -> !order.getCreatedAt().isBefore(startDate) && !order.getCreatedAt().isAfter(endDate))
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .toList();

        // Calculate total expense
        double totalExpense = filteredOrders.stream()
                .mapToDouble(Order::getTotalAmount)
                .sum();

        // Prepare response
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("orders", filteredOrders);
        result.put("totalExpense", totalExpense);
        result.put("orderCount", filteredOrders.size());

        return result;
    }

    private void validateAddress(Address address) {
        if (address == null) {
            throw new RuntimeException("Địa chỉ giao hàng chưa được thiết lập. Vui lòng cập nhật hồ sơ trước khi đặt hàng.");
        }
        if (isPlaceholder(address.getStreet())
                || isPlaceholder(address.getWard())
                || isPlaceholder(address.getDistrict())
                || isPlaceholder(address.getCity())) {
            throw new RuntimeException("Địa chỉ giao hàng không hợp lệ. Vui lòng cập nhật đầy đủ thông tin trước khi đặt hàng.");
        }
    }

    private void validateCustomerContact(Customer customer) {
        if (customer == null) {
            throw new RuntimeException("Không thể xác định thông tin khách hàng.");
        }
        if (isPlaceholder(customer.getFullName()) || isPlaceholder(customer.getPhone())) {
            throw new RuntimeException("Thông tin cá nhân chưa hoàn tất. Vui lòng cập nhật họ tên và số điện thoại trước khi đặt hàng.");
        }
        if (isPlaceholder(resolveCustomerEmail(customer))) {
            throw new RuntimeException("Email chưa được cập nhật. Vui lòng cập nhật email trước khi đặt hàng.");
        }
    }

    private boolean isPlaceholder(String value) {
        if (value == null) {
            return true;
        }
        String normalized = value.trim();
        return normalized.isEmpty() || PLACEHOLDER_VALUE.equalsIgnoreCase(normalized);
    }

    private String resolveCustomerEmail(Customer customer) {
        if (customer == null || customer.getAccount() == null) {
            return null;
        }
        return customer.getAccount().getEmail();
    }

    /**
     * Hoàn trả tồn kho khi đơn hàng bị hủy
     * Chỉ hoàn trả nếu đơn hàng chưa bị hủy trước đó (tránh hoàn trả 2 lần)
     */
    private void restoreStockFromCancelledOrder(Order order) {
        if (order == null) return;
        
        // Chỉ hoàn trả nếu đơn hàng chưa bị hủy (tránh hoàn trả 2 lần)
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return;
        }

        // Lấy danh sách OrderItem từ đơn hàng
        List<OrderItem> orderItems = order.getItems();
        if (orderItems == null || orderItems.isEmpty()) {
            return;
        }

        List<Product> productsToUpdate = new ArrayList<>();

        for (OrderItem item : orderItems) {
            Product product = item.getProduct();
            if (product == null) continue;

            // Hoàn trả số lượng đã trừ
            int quantityToRestore = item.getQuantity();
            product.setStock(product.getStock() + quantityToRestore);
            
            // Nếu tồn kho > 0 sau khi hoàn trả, tự động hiện lại sản phẩm
            // (nếu trước đó bị ẩn do hết hàng)
            if (product.getStock() > 0 && product.isHidden()) {
                product.setHidden(false);
            }
            
            productsToUpdate.add(product);
        }

        // Lưu các sản phẩm đã cập nhật
        if (!productsToUpdate.isEmpty()) {
            productRepository.saveAll(productsToUpdate);
        }
    }
}
