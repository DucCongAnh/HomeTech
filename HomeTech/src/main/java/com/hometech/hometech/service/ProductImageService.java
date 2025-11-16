package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ProductImageRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductImage;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductImageService {

    public ProductImageService(ProductRepository productRepository, ProductImageRepository productImageRepository) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
    }

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    public List<ProductImage> uploadImages(Long productId, MultipartFile[] files) {

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        List<ProductImage> images = new ArrayList<>();

        try {
            for (MultipartFile file : files) {
                ProductImage img = new ProductImage();
                img.setFileName(file.getOriginalFilename());
                img.setImageData(file.getBytes());
                img.setProduct(product);

                images.add(img);
            }

            return productImageRepository.saveAll(images);

        } catch (Exception e) {
            throw new RuntimeException("Lỗi upload ảnh: " + e.getMessage());
        }
    }


    public List<ProductImage> getImages(Long productId) {
        return productImageRepository.findByProduct_Id(productId);
    }

    public void deleteImage(Long id) {
        if (!productImageRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy ảnh");
        }
        productImageRepository.deleteById(id);
    }
}
