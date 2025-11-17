package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CartItemRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Cart;
import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Product;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class CartService {

    private final CartItemRepository cartRepo;
    private final ProductRepository productRepo;
    private final CustomerRepository customerRepo;
    private final UserRepository userRepository;

    public CartService(CartItemRepository cartRepo,
                       ProductRepository productRepo,
                       CustomerRepository customerRepo,
                       UserRepository userRepository) {
        this.cartRepo = cartRepo;
        this.productRepo = productRepo;
        this.customerRepo = customerRepo;
        this.userRepository = userRepository;
    }

    // Lấy customer theo userId hoặc ném ngoại lệ
    private Customer getCustomerByUserIdOrThrow(Long userId) {
        // Customer extends User, nên Customer ID = User ID
        Optional<Customer> opt = customerRepo.findById(userId);
        if (opt.isPresent()) {
            return opt.get();
        }
        throw new RuntimeException("Customer not found for userId=" + userId);
    }

    // ===== Utility: đảm bảo customer có cart, tạo nếu chưa có =====
    private void ensureCustomerHasCart(Customer customer) {
        if (customer.getCart() == null) {
            Cart newCart = new Cart();
            newCart.setCustomer(customer);
            customer.setCart(newCart);
            // lưu customer để cascade tạo cart (cần đảm bảo Customer entity cascade ALL cho Cart)
            customerRepo.save(customer);
        }
    }

    // ===== Public APIs =====

    // Xem tất cả items (admin)
    public List<CartItem> getAllItems() {
        return cartRepo.findAll();
    }

    // Lấy giỏ hàng theo user (login)
    public List<CartItem> getCartItemsByUserId(Long userId) {
        Customer customer = getCustomerByUserIdOrThrow(userId);
        if (customer.getCart() == null) return List.of();
        // findByCart with @EntityGraph will eagerly load product
        List<CartItem> items = cartRepo.findByCart(customer.getCart());
        return items;
    }


    // Thêm sản phẩm vào giỏ của user
    public CartItem addProduct(long userId, long productId, int quantity) {
        Customer customer = getCustomerByUserIdOrThrow(userId);

        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id=" + productId));

        // ensure cart exists
        ensureCustomerHasCart(customer);

        // tìm item có cùng product id trong cùng cart (so sánh bằng Objects.equals)
        List<CartItem> existingItems = cartRepo.findByCart(customer.getCart());
        Optional<CartItem> existingItem = existingItems.stream()
                .filter(item -> item.getProduct() != null && Objects.equals(item.getProduct().getId(), product.getId()))
                .findFirst();

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantity);
            return cartRepo.save(item);
        } else {
            CartItem newItem = new CartItem();
            newItem.setProduct(product);
            newItem.setCart(customer.getCart());
            newItem.setQuantity(quantity);
            return cartRepo.save(newItem);
        }
    }


    // Tăng số lượng (user)
    public CartItem increaseQuantity(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = getCustomerByUserIdOrThrow(userId);

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        item.setQuantity(item.getQuantity() + 1);
        return cartRepo.save(item);
    }

    // Giảm số lượng (user)
    public CartItem decreaseQuantity(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = getCustomerByUserIdOrThrow(userId);

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        if (item.getQuantity() > 1) {
            item.setQuantity(item.getQuantity() - 1);
            return cartRepo.save(item);
        } else {
            cartRepo.deleteById(itemId);
            return null;
        }
    }

    // Remove item (user)
    public void removeItem(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found for userId=" + userId));

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        cartRepo.deleteById(itemId);
    }


}
