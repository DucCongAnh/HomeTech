package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CategoryRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }
    public Product save(Product product) {
        // Tự động ẩn sản phẩm khi tồn kho = 0
        updateHiddenBasedOnStock(product);
        return productRepository.save(product);
    }

    /**
     * Tự động ẩn sản phẩm khi tồn kho = 0
     * Nếu tồn kho > 0, giữ nguyên trạng thái hidden hiện tại (không tự động hiện lại)
     */
    private void updateHiddenBasedOnStock(Product product) {
        if (product == null) return;
        
        if (product.getStock() <= 0) {
            // Tự động ẩn khi hết hàng
            product.setHidden(true);
        }
        // Nếu stock > 0, giữ nguyên hidden (admin có thể ẩn/hiện thủ công)
    }
    // 🟢 Lấy toàn bộ sản phẩm (bao gồm cả hidden - chỉ dùng cho admin)
    public List<Product> getAll() {
        return productRepository.findAll();
    }

    // 🟢 Lấy tất cả sản phẩm active (hidden = false)
    public List<Product> getAllActive() {
        return productRepository.findByHiddenFalse();
    }

    // 🟢 Lấy sản phẩm theo ID
    public Product getById(long id) {
        return productRepository.findById(id).orElse(null);
    }
    // 🟢 Hiện lại sản phẩm
    public boolean showProduct(long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;

        product.setHidden(false);
        productRepository.save(product);
        return true;
    }

    // 🔄 Toggle ẩn/hiện
    public Product toggleHidden(long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return null;

        product.setHidden(!product.isHidden());
        return productRepository.save(product);
    }

    public boolean deleteById(long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;
        productRepository.delete(product);
        return true;
    }
    // 🟢 Lấy sản phẩm theo danh mục (Category object)
    public List<Product> getProductsByCategory(Category category) {
        return productRepository.findByCategory(category);
    }

    // 🟢 Lấy sản phẩm theo ID danh mục
    public List<Product> getProductsByCategoryId(int categoryId) {
        return productRepository.findByCategory_Id(categoryId);
    }

    // 🟢 Lấy sản phẩm theo tên danh mục
    public List<Product> getProductsByCategoryName(String categoryName) {
        return productRepository.findByCategory_Name(categoryName);
    }

    // 🟢 Lấy sản phẩm đang hoạt động (status = true) theo Category object
    public List<Product> getActiveProductsByCategory(Category category) {
        return productRepository.findByCategoryAndHidden(category, false);
    }

    // 🟢 Lấy sản phẩm đang hoạt động theo ID danh mục
    public List<Product> getActiveProductsByCategoryId(long categoryId) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null) {
            return Collections.emptyList(); // Trả về list rỗng thay vì lỗi
        }
        return productRepository.findByCategoryAndHidden(category, false);
    }


    // 🟢 Lấy sản phẩm đang hoạt động theo tên danh mục
    public List<Product> getActiveProductsByCategoryName(String categoryName) {
        Category category = categoryRepository.findAll().stream()
                .filter(c -> c.getName().equalsIgnoreCase(categoryName))
                .findFirst()
                .orElse(null);

        if (category == null) {
            return Collections.emptyList();
        }
        return productRepository.findByCategoryAndHidden(category, false);
    }

    // 🟢 Lấy sản phẩm mới thêm trong 7 ngày qua (chỉ active)
    public List<Product> getProductsAddedInLast7Days() {
        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
        List<Product> products = productRepository.findByCreatedAtAfter(lastWeek);
        return products.stream().filter(p -> !p.isHidden()).toList();
    }

    // 🟢 Lấy top 10 sản phẩm bán chạy nhất (chỉ active)
    public List<Product> getTop10BestSellingProducts() {
        List<Product> products = productRepository.findTop10ByOrderBySoldCountDesc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }

    // 🟢 Lấy top 10 sản phẩm bán chạy nhất theo tên danh mục (chỉ active)
    public List<Product> getTop10BestSellingProductsByCategory(String categoryName) {
        List<Product> products = productRepository.findTop10ByCategory_NameOrderBySoldCountDesc(categoryName);
        return products.stream().filter(p -> !p.isHidden()).toList();
    }

    // 🔎 Search products by keyword in name (chỉ active)
    public List<Product> searchByName(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) return getAllActive();
        List<Product> products = productRepository.findByNameContainingIgnoreCase(keyword.trim());
        return products.stream().filter(p -> !p.isHidden()).toList();
    }
    public List<Product> sortByPriceAsc() {
        List<Product> products = productRepository.findAllByOrderByPriceAsc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }
    public List<Product> sortByPriceDesc() {
        List<Product> products = productRepository.findAllByOrderByPriceDesc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }
    public List<Product> sortBySoldAsc() {
        List<Product> products = productRepository.findAllByOrderBySoldCountAsc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }
    public List<Product> sortBySoldDesc() {
        List<Product> products = productRepository.findAllByOrderBySoldCountDesc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }
    public List<Product> sortByNewest() {
        List<Product> products = productRepository.findAllByOrderByCreatedAtDesc();
        return products.stream().filter(p -> !p.isHidden()).toList();
    }

}
