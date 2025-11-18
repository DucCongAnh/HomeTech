package com.hometech.hometech.Repository;

import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByCart(Cart cart);
}
