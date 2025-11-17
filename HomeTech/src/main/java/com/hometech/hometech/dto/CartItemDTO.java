package com.hometech.hometech.dto;

import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Product;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CartItemDTO {
    private Long id;
    private int quantity;
    private Product product;

    public CartItemDTO(CartItem cartItem) {
        this.id = cartItem.getId();
        this.quantity = cartItem.getQuantity();
        // Load product explicitly to avoid lazy loading issues
        if (cartItem.getProduct() != null) {
            this.product = cartItem.getProduct();
        }
    }
}

