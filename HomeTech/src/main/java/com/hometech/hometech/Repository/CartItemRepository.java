package com.hometech.hometech.Repository;

import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @EntityGraph(attributePaths = {"product"})
    List<CartItem> findByCart(Cart cart);
}
