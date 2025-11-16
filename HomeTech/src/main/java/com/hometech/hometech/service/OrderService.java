package com.hometech.hometech.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.hometech.hometech.Repository.CartItemRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.OrderItemRepository;
import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.OrderItem;
import com.hometech.hometech.model.User;

@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final CartItemRepository cartRepo;
    private final CustomerRepository customerRepo;
    private final NotifyService notifyService;

    public OrderService(OrderRepository orderRepo, OrderItemRepository orderItemRepo,
                        CartItemRepository cartRepo, CustomerRepository customerRepo,
                        NotifyService notifyService) {
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.cartRepo = cartRepo;
        this.customerRepo = customerRepo;
        this.notifyService = notifyService;
    }

    // 🟢 Tạo đơn hàng từ giỏ hàng của user cụ thể
    public Order createOrder(Long userId) {
        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (customer.getCart() == null) {
            throw new RuntimeException("Customer cart not found");
        }

        List<CartItem> cartItems = cartRepo.findByCart(customer.getCart());
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống!");
        }

        double total = 0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem c : cartItems) {
            double subtotal = c.getProduct().getPrice() * c.getQuantity();
            total += subtotal;

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(c.getProduct());
            orderItem.setQuantity(c.getQuantity());
            orderItem.setPrice(c.getProduct().getPrice());
            orderItems.add(orderItem);
        }

        Order order = new Order();
        order.setCustomer(customer);
        order.setTotalAmount(total);
        order.setStatus(OrderStatus.WAITING_CONFIRMATION);
        order.setItems(orderItems);
        order.setCreatedAt(LocalDateTime.now());

        orderItems.forEach(item -> item.setOrder(order));

        orderRepo.save(order);
        orderItemRepo.saveAll(orderItems);
        cartRepo.deleteAll(cartItems);

        return order;
    }

    // 🆕 Tạo đơn hàng cho khách (guest)


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
}
