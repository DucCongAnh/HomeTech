package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProduct_Id(Long productId);


}
