package com.hometech.hometech.Repository;

import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    // Lấy tất cả đơn hàng của một customer
    List<Order> findByCustomer(Customer customer);

    List<Order> findByCustomerAndStatus(Customer customer, OrderStatus status);
    List<Order> findByStatus(OrderStatus status);

}
