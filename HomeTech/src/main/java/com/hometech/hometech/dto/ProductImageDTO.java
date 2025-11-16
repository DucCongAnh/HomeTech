package com.hometech.hometech.dto;

import com.hometech.hometech.model.ProductImage;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Base64;

@Data
@NoArgsConstructor
public class ProductImageDTO {
    private Long id;
    private String fileName;
    private String imageData; // Base64 string

    public ProductImageDTO(ProductImage productImage) {
        this.id = productImage.getId();
        this.fileName = productImage.getFileName();
        if (productImage.getImageData() != null) {
            this.imageData = Base64.getEncoder().encodeToString(productImage.getImageData());
        }
    }
}

