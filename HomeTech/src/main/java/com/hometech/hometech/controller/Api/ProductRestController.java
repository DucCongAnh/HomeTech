package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductImage;
import com.hometech.hometech.service.CategoryService;
import com.hometech.hometech.service.ProductImageService;
import com.hometech.hometech.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/products")
public class ProductRestController {

    private final ProductService productService;
    private final CategoryService categoryService;
    private final ProductImageService productImageService;

    public ProductRestController(ProductService productService, CategoryService categoryService, ProductImageService productImageService) {
        this.productService = productService;
        this.categoryService = categoryService;
        this.productImageService = productImageService;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success,
            String message,
            Object data,
            String error,
            HttpStatus status
    ) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    // 🟢 Lấy tất cả sản phẩm
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        List<Product> products = productService.getAll();
        return buildResponse(true, "Lấy danh sách sản phẩm thành công", products, null, HttpStatus.OK);
    }

    // 🟢 Lấy sản phẩm theo ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProductById(@PathVariable long id) {
        Product product = productService.getById(id);

        if (product == null) {
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);
        }

        return buildResponse(true, "Lấy sản phẩm thành công", product, null, HttpStatus.OK);
    }
    @PutMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleProduct(@PathVariable long id) {
        boolean ok = productService.toggleHidden(id);
        if (!ok)
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);

        return buildResponse(true, "Thay đổi trạng thái thành công", null, null, HttpStatus.OK);
    }
    // 🟢 Lấy sản phẩm theo ID danh mục
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Map<String, Object>> getProductsByCategoryId(@PathVariable int categoryId) {
        List<Product> list = productService.getProductsByCategoryId(categoryId);
        return buildResponse(true, "Lấy sản phẩm theo danh mục thành công", list, null, HttpStatus.OK);
    }

    // 🟢 Lấy sản phẩm đang active theo danh mục
    @GetMapping("/category/{categoryId}/active")
    public ResponseEntity<Map<String, Object>> getActiveProductsByCategoryId(@PathVariable long categoryId) {
        List<Product> list = productService.getActiveProductsByCategoryId(categoryId);
        return buildResponse(true, "Lấy sản phẩm active theo danh mục thành công", list, null, HttpStatus.OK);
    }

    // 🟢 Tạo sản phẩm mới
    @PostMapping
    public ResponseEntity<Map<String, Object>> createProduct(@RequestBody Product product) {

        // Kiểm tra category
        if (product.getCategory() != null && product.getCategory().getId() != null) {

            Category category = categoryService.getById(product.getCategory().getId());

            if (category == null) {
                return buildResponse(false, "Category không tồn tại", null, "Invalid category", HttpStatus.BAD_REQUEST);
            }

            product.setCategory(category);
        }

        Product saved = productService.save(product);

        return buildResponse(true, "Thêm sản phẩm thành công", saved, null, HttpStatus.OK);
    }

    // 🟢 Cập nhật sản phẩm
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(@PathVariable long id, @RequestBody Product product) {

        Product existing = productService.getById(id);

        if (existing == null) {
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);
        }

        // update fields
        product.setId(id);
        Product updated = productService.save(product);

        return buildResponse(true, "Cập nhật sản phẩm thành công", updated, null, HttpStatus.OK);
    }

    // 🟢 Lấy thông tin danh mục và thống kê
    @GetMapping("/category/{categoryId}/info")
    public ResponseEntity<Map<String, Object>> getCategoryInfo(@PathVariable long categoryId) {

        Category category = categoryService.getById(categoryId);

        if (category == null) {
            return buildResponse(false, "Không tìm thấy danh mục", null, "Category not found", HttpStatus.NOT_FOUND);
        }

        long total = categoryService.countProductsInCategory(categoryId);
        long active = categoryService.countActiveProductsInCategory(categoryId);

        Map<String, Object> info = Map.of(
                "category", category,
                "totalProducts", total,
                "activeProducts", active
        );

        return buildResponse(true, "Lấy thông tin danh mục thành công", info, null, HttpStatus.OK);
    }
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam String keyword) {
        return buildResponse(true, "Tìm kiếm thành công",
                productService.searchByName(keyword), null, HttpStatus.OK);
    }
    @GetMapping("/sort/price/asc")
    public ResponseEntity<Map<String, Object>> sortPriceAsc() {
        return buildResponse(true, "Sắp xếp theo giá tăng dần",
                productService.sortByPriceAsc(), null, HttpStatus.OK);
    }
    @GetMapping("/sort/price/desc")
    public ResponseEntity<Map<String, Object>> sortPriceDesc() {
        return buildResponse(true, "Sắp xếp theo giá giảm dần",
                productService.sortByPriceDesc(), null, HttpStatus.OK);
    }

    @GetMapping("/sort/sold/asc")
    public ResponseEntity<Map<String, Object>> sortSoldAsc() {
        return buildResponse(true, "Sắp xếp theo lượt bán tăng",
                productService.sortBySoldAsc(), null, HttpStatus.OK);
    }

    @GetMapping("/sort/sold/desc")
    public ResponseEntity<Map<String, Object>> sortSoldDesc() {
        return buildResponse(true, "Sắp xếp theo lượt bán giảm",
                productService.sortBySoldDesc(), null, HttpStatus.OK);
    }

    @GetMapping("/newest")
    public ResponseEntity<Map<String, Object>> getNewest() {
        return buildResponse(true, "Lấy sản phẩm mới nhất",
                productService.sortByNewest(), null, HttpStatus.OK);
    }

    @GetMapping("/top-selling")
    public ResponseEntity<Map<String, Object>> getTopSelling() {
        return buildResponse(true, "Top 10 bán chạy",
                productService.getTop10BestSellingProducts(), null, HttpStatus.OK);
    }

    @GetMapping("/last-7-days")
    public ResponseEntity<Map<String, Object>> getLast7Days() {
        return buildResponse(true, "Sản phẩm trong 7 ngày gần đây",
                productService.getProductsAddedInLast7Days(), null, HttpStatus.OK);
    }

//    IMAGE
    @PostMapping("/{productId}/images")
    public ResponseEntity<Map<String, Object>> uploadImages(
            @PathVariable Long productId,
            @RequestParam("files") MultipartFile[] files)
    {
        try {
            List<ProductImage> images = productImageService.uploadImages(productId, files);

            // Chỉ lấy tên ảnh
            List<String> fileNames = images.stream()
                    .map(ProductImage::getFileName)
                    .toList();

            return buildResponse(true, "Upload ảnh thành công", fileNames, null, HttpStatus.OK);

        } catch (Exception e) {
            return buildResponse(false, "Lỗi upload ảnh", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }


    @GetMapping("/{productId}/images")
    public ResponseEntity<Map<String, Object>> getImages(@PathVariable Long productId) {
        List<ProductImage> images = productImageService.getImages(productId);
        return buildResponse(true, "Lấy danh sách ảnh thành công", images, null, HttpStatus.OK);
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<Map<String, Object>> deleteImage(@PathVariable Long imageId) {
        try {
            productImageService.deleteImage(imageId);
            return buildResponse(true, "Xóa ảnh thành công", null, null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, "Không tìm thấy ảnh", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }


}
