package com.hometech.hometech.controller.Api;

import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderRestController {

    private final OrderService orderService;

    public OrderRestController(OrderService orderService) {
        this.orderService = orderService;
    }

    // 🟢 Tạo đơn hàng từ giỏ hàng của user
    @PostMapping("/create/{userId}")
    public ResponseEntity<Order> createOrder(@PathVariable Long userId) {
        try {
            Order order = orderService.createOrder(userId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 🟢 Lấy tất cả đơn hàng của user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Order>> getOrdersByUserId(@PathVariable Long userId) {
        try {
            List<Order> orders = orderService.getOrdersByUserId(userId);
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 🟢 Lấy đơn hàng của user theo trạng thái
    @GetMapping("/user/{userId}/status/{status}")
    public ResponseEntity<List<Order>> getOrdersByUserIdAndStatus(
            @PathVariable Long userId,
            @PathVariable OrderStatus status) {
        try {
            List<Order> orders = orderService.getOrdersByUserIdAndStatus(userId, status);
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 🟢 Lấy tất cả đơn hàng (admin only)
    @GetMapping("/admin/all")
    public ResponseEntity<List<Order>> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    // 🟢 Lấy đơn hàng theo trạng thái (admin only)
    @GetMapping("/admin/status/{status}")
    public ResponseEntity<List<Order>> getOrdersByStatus(@PathVariable OrderStatus status) {
        List<Order> orders = orderService.getOrdersByStatus(status);
        return ResponseEntity.ok(orders);
    }

    // 🟢 Xem chi tiết đơn hàng
    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrderById(@PathVariable int orderId) {
        Order order = orderService.getOrderById(orderId);
        if (order != null) {
            return ResponseEntity.ok(order);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 🟢 Cập nhật trạng thái đơn hàng (admin only)
    @PutMapping("/{orderId}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable int orderId,
            @RequestParam OrderStatus newStatus) {
        try {
            Order order = orderService.updateStatus(orderId, newStatus);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 🟢 Lấy danh sách tất cả trạng thái đơn hàng
    @GetMapping("/statuses")
    public ResponseEntity<OrderStatus[]> getAllOrderStatuses() {
        return ResponseEntity.ok(OrderStatus.values());
    }

    // 🔴 Kiểm tra xem đơn hàng có thể hủy không
    @GetMapping("/{orderId}/can-cancel")
    public ResponseEntity<Boolean> canCancelOrder(@PathVariable int orderId) {
        boolean canCancel = orderService.canCancelOrder(orderId);
        return ResponseEntity.ok(canCancel);
    }

    // 🔴 Hủy đơn hàng bởi user (chỉ trong vòng 30 phút)
    @PutMapping("/{orderId}/cancel/user/{userId}")
    public ResponseEntity<Order> cancelOrderByUser(
            @PathVariable int orderId,
            @PathVariable Long userId) {
        try {
            Order order = orderService.cancelOrderByUser(userId, orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 🔴 Hủy đơn hàng bởi admin (không giới hạn thời gian)
    @PutMapping("/{orderId}/cancel/admin")
    public ResponseEntity<Order> cancelOrderByAdmin(@PathVariable int orderId) {
        try {
            Order order = orderService.cancelOrderByAdmin(orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
