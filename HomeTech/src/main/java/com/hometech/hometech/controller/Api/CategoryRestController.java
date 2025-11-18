package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/categories")
public class CategoryRestController {

    private final CategoryService categoryService;

    public CategoryRestController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    // ---- TEMPLATE RESPONSE ----
    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success, String message, Object data, String error, HttpStatus status) {

        Map<String, Object> res = new HashMap<>();
        res.put("status", status.value());
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    // 🟢 Lấy tất cả danh mục
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllCategories() {
        List<Category> categories = categoryService.getAll();
        return buildResponse(true, "Lấy danh sách danh mục thành công", categories, null, HttpStatus.OK);
    }

    // 🟢 Lấy danh mục theo ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCategoryById(@PathVariable int id) {
        Category category = categoryService.getById(id);

        if (category == null)
            return buildResponse(false, "Không tìm thấy danh mục", null, "Category not found", HttpStatus.NOT_FOUND);

        return buildResponse(true, "Lấy danh mục thành công", category, null, HttpStatus.OK);
    }

    // 🟢 Lấy danh mục theo tên
    @GetMapping("/name/{categoryName}")
    public ResponseEntity<Map<String, Object>> getCategoryByName(@PathVariable String categoryName) {
        Category category = categoryService.getByName(categoryName);

        if (category == null)
            return buildResponse(false, "Không tìm thấy danh mục", null, "Category not found", HttpStatus.NOT_FOUND);

        return buildResponse(true, "Lấy danh mục thành công", category, null, HttpStatus.OK);
    }

    // 🟢 Lấy danh sách sản phẩm theo danh mục
    @GetMapping("/{categoryId}/products")
    public ResponseEntity<Map<String, Object>> getProductsInCategory(@PathVariable int categoryId) {
        List<Product> products = categoryService.getProductsByCategory(categoryId);
        return buildResponse(true, "Lấy danh sách sản phẩm theo danh mục", products, null, HttpStatus.OK);
    }

    // 🟢 Lấy danh sách sản phẩm đang active trong danh mục
    @GetMapping("/{categoryId}/products/active")
    public ResponseEntity<Map<String, Object>> getActiveProductsInCategory(@PathVariable int categoryId) {
        List<Product> products = categoryService.getActiveProductsByCategory(categoryId);
        return buildResponse(true, "Lấy danh sách sản phẩm active", products, null, HttpStatus.OK);
    }

    // 🟢 Đếm số sản phẩm trong danh mục
    @GetMapping("/{categoryId}/count")
    public ResponseEntity<Map<String, Object>> countProductsInCategory(@PathVariable int categoryId) {
        long count = categoryService.countProductsInCategory(categoryId);
        return buildResponse(true, "Đếm số lượng sản phẩm thành công", count, null, HttpStatus.OK);
    }

    // 🟢 Đếm số sản phẩm đang hoạt động
    @GetMapping("/{categoryId}/count/active")
    public ResponseEntity<Map<String, Object>> countActiveProductsInCategory(@PathVariable int categoryId) {
        long count = categoryService.countActiveProductsInCategory(categoryId);
        return buildResponse(true, "Đếm số lượng sản phẩm active thành công", count, null, HttpStatus.OK);
    }

    // 🟢 Lấy thông tin danh mục tổng hợp
    @GetMapping("/{categoryId}/info")
    public ResponseEntity<Map<String, Object>> getCategoryInfo(@PathVariable int categoryId) {
        Category category = categoryService.getById(categoryId);

        if (category == null)
            return buildResponse(false, "Không tìm thấy danh mục", null,
                    "Category not found", HttpStatus.NOT_FOUND);

        long totalProducts = categoryService.countProductsInCategory(categoryId);
        long activeProducts = categoryService.countActiveProductsInCategory(categoryId);

        Map<String, Object> info = new HashMap<>();
        info.put("category", category);
        info.put("totalProducts", totalProducts);
        info.put("activeProducts", activeProducts);

        return buildResponse(true, "Lấy thông tin danh mục thành công", info, null, HttpStatus.OK);
    }

    // 🟢 Tạo danh mục mới
    @PostMapping
    public ResponseEntity<Map<String, Object>> createCategory(@RequestBody Category category) {
        categoryService.save(category);
        return buildResponse(true, "Tạo danh mục thành công", category, null, HttpStatus.OK);
    }

    // 🟢 Cập nhật danh mục
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateCategory(
            @PathVariable long id, @RequestBody Category category) {

        Category existing = categoryService.getById(id);

        if (existing == null)
            return buildResponse(false, "Không tìm thấy danh mục", null,
                    "Category not found", HttpStatus.NOT_FOUND);

        category.setId(id);
        categoryService.save(category);
        return buildResponse(true, "Cập nhật danh mục thành công", category, null, HttpStatus.OK);
    }

    // 🟢 Xóa danh mục
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable int id) {
        Category category = categoryService.getById(id);

        if (category == null)
            return buildResponse(false, "Không tìm thấy danh mục", null,
                    "Category not found", HttpStatus.NOT_FOUND);

        categoryService.delete(id);
        return buildResponse(true, "Xóa danh mục thành công", null, null, HttpStatus.OK);
    }
}
