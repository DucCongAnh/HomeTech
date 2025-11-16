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
        return productRepository.save(product);
    }
    // 🟢 Lấy toàn bộ sản phẩm
    public List<Product> getAll() {
        return productRepository.findAll();
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
    public boolean toggleHidden(long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return false;

        product.setHidden(!product.isHidden());
        productRepository.save(product);
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

    // 🟢 Lấy sản phẩm mới thêm trong 7 ngày qua
    public List<Product> getProductsAddedInLast7Days() {
        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
        return productRepository.findByCreatedAtAfter(lastWeek);
    }

    // 🟢 Lấy top 10 sản phẩm bán chạy nhất
    public List<Product> getTop10BestSellingProducts() {
        return productRepository.findTop10ByOrderBySoldCountDesc();
    }

    // 🟢 Lấy top 10 sản phẩm bán chạy nhất theo tên danh mục
    public List<Product> getTop10BestSellingProductsByCategory(String categoryName) {
        return productRepository.findTop10ByCategory_NameOrderBySoldCountDesc(categoryName);
    }

    // 🔎 Search products by keyword in name
    public List<Product> searchByName(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) return getAll();
        return productRepository.findByNameContainingIgnoreCase(keyword.trim());
    }
    public List<Product> sortByPriceAsc() {
        return productRepository.findAllByOrderByPriceAsc();
    }
    public List<Product> sortByPriceDesc() {
        return productRepository.findAllByOrderByPriceDesc();
    }
    public List<Product> sortBySoldAsc() {
        return productRepository.findAllByOrderBySoldCountAsc();
    }
    public List<Product> sortBySoldDesc() {
        return productRepository.findAllByOrderBySoldCountDesc();
    }
    public List<Product> sortByNewest() {
        return productRepository.findAllByOrderByCreatedAtDesc();
    }

}
