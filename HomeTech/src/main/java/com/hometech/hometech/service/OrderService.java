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

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final CartItemRepository cartRepo;
    private final CustomerRepository customerRepo;
    private final NotifyService notifyService;
    private final AddressRepository addressRepo;
    private final VoucherRepository voucherRepo;
    private final PaymentRepository paymentRepository;


    public OrderService(OrderRepository orderRepo, OrderItemRepository orderItemRepo,
                        CartItemRepository cartRepo, CustomerRepository customerRepo,
                        NotifyService notifyService,
                        AddressRepository addressRepo,
                        VoucherRepository voucherRepo,
                        PaymentRepository paymentRepository) {
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.cartRepo = cartRepo;
        this.customerRepo = customerRepo;
        this.notifyService = notifyService;
        this.addressRepo = addressRepo;
        this.voucherRepo=voucherRepo;
        this.paymentRepository = paymentRepository;
    }

    // 🟢 Tạo đơn hàng từ giỏ hàng của user cụ thể
    public Order createOrder(Long userId, String code, PaymentMethod paymentMethod) {
        // (1) Customer
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // (2) Address
        Address address = addressRepo.findFirstByCustomer_IdOrderByIdAsc(customer.getId())
                .orElseThrow(() -> new RuntimeException("Khách hàng chưa có địa chỉ giao hàng. Vui lòng cập nhật hồ sơ trước khi đặt hàng."));
        OrderAddress orderAddress = new OrderAddress();
        orderAddress.setFullName(customer.getFullName());
        orderAddress.setPhone(customer.getPhone());
        orderAddress.setStreet(address.getStreet());
        orderAddress.setWard(address.getWard());
        orderAddress.setDistrict(address.getDistrict());
        orderAddress.setCity(address.getCity());

        // (3) Cart
        if (customer.getCart() == null)
            throw new RuntimeException("Customer cart not found");

        List<CartItem> cartItems = cartRepo.findByCart(customer.getCart());
        if (cartItems.isEmpty())
            throw new RuntimeException("Giỏ hàng trống!");

        // (4) Tính tổng
        double subtotal = 0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem c : cartItems) {
            double itemTotal = c.getProduct().getPrice() * c.getQuantity();
            subtotal += itemTotal;

            OrderItem oi = new OrderItem();
            oi.setProduct(c.getProduct());
            oi.setQuantity(c.getQuantity());
            oi.setPrice(c.getProduct().getPrice());
            orderItems.add(oi);
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
        order.setDeliveryAddress(orderAddress);
        order.setTotalAmount(finalTotal);
        order.setStatus(OrderStatus.WAITING_CONFIRMATION);
        order.setCreatedAt(LocalDateTime.now());
        order.setVoucher(voucher);   // ⬅ ⬅ Gắn voucher vào Order
        order.setPaymentMethod(paymentMethod != null ? paymentMethod : PaymentMethod.COD);
        order.setItems(orderItems);

        orderItems.forEach(i -> i.setOrder(order));

        // (7) Lưu DB
        orderRepo.save(order);
        orderItemRepo.saveAll(orderItems);

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

        // (8) Xóa cart sau khi tạo đơn
        cartRepo.deleteAll(cartItems);

        return order;
    }

    public PreviewOrderResponse previewOrder(Long userId, String voucherCode) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        List<CartItem> cartItems = cartRepo.findByCart(customer.getCart());
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống");
        }

        double subtotal = cartItems.stream()
                .mapToDouble(c -> c.getProduct().getPrice() * c.getQuantity())
                .sum();

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
}
