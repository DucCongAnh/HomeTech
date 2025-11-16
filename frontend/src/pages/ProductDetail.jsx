import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import styles from './ProductDetail.module.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadProductData();
  }, [id]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      
      const [productRes, imagesRes, reviewsRes, ratingRes] = await Promise.all([
        userAPI.getProductById(id),
        userAPI.getProductImages(id),
        userAPI.getProductReviews(id),
        userAPI.getProductRating(id)
      ]);

      const productData = productRes.data;
      setProduct(productData);

      const imagesData = imagesRes.data || [];
      setImages(imagesData.map(img => ({
        ...img,
        url: img.imageData ? `data:image/jpeg;base64,${img.imageData}` : null
      })));

      const reviewsData = reviewsRes.data || [];
      setReviews(reviewsData);

      const rating = ratingRes.data || 0;
      setAverageRating(rating);

    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={i < rating ? styles.starFilled : styles.starEmpty}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Sản phẩm không tồn tại</h2>
          <Link to="/" className={styles.backButton}>Quay lại trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>HomeTech</span>
          </Link>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Quay lại
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/">Trang chủ</Link>
        <span> / </span>
        <span>{product.name}</span>
      </div>

      {/* Product Detail */}
      <div className={styles.productDetail}>
        <div className={styles.productImages}>
          {images.length > 0 ? (
            <>
              <div className={styles.mainImage}>
                <img
                  src={images[selectedImageIndex]?.url}
                  alt={product.name}
                />
              </div>
              {images.length > 1 && (
                <div className={styles.thumbnailImages}>
                  {images.map((img, index) => (
                    <button
                      key={index}
                      className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.active : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={img.url} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.productInfo}>
          <h1 className={styles.productName}>{product.name}</h1>
          
          {averageRating > 0 && (
            <div className={styles.rating}>
              <div className={styles.ratingStars}>
                {renderStars(Math.round(averageRating))}
              </div>
              <span className={styles.ratingValue}>{averageRating.toFixed(1)}</span>
              <span className={styles.reviewCount}>({reviews.length} đánh giá)</span>
            </div>
          )}

          <div className={styles.priceSection}>
            <div className={styles.price}>{formatPrice(product.price)}</div>
            {product.soldCount > 0 && (
              <div className={styles.soldCount}>Đã bán: {product.soldCount}</div>
            )}
          </div>

          {product.category && (
            <div className={styles.category}>
              <strong>Danh mục:</strong> {product.category.name}
            </div>
          )}

          <div className={styles.stock}>
            <strong>Tồn kho:</strong> {product.stock > 0 ? `${product.stock} sản phẩm` : 'Hết hàng'}
          </div>

          <div className={styles.actions}>
            <button className={styles.addToCartButton}>
              Thêm vào giỏ hàng
            </button>
            <button className={styles.buyNowButton}>
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className={styles.reviewsSection}>
        <h2 className={styles.reviewsTitle}>Đánh giá sản phẩm</h2>
        
        {averageRating > 0 && (
          <div className={styles.ratingSummary}>
            <div className={styles.ratingSummaryLeft}>
              <div className={styles.averageRating}>{averageRating.toFixed(1)}</div>
              <div className={styles.ratingSummaryStars}>
                {renderStars(Math.round(averageRating))}
              </div>
              <div className={styles.totalReviews}>{reviews.length} đánh giá</div>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className={styles.noReviews}>
            <p>Chưa có đánh giá nào cho sản phẩm này</p>
          </div>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewerInfo}>
                    <div className={styles.reviewerAvatar}>
                      {review.customer?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className={styles.reviewerName}>
                        {review.customer?.fullName || 'Khách hàng'}
                      </div>
                      <div className={styles.reviewDate}>
                        {formatDate(review.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </div>
                </div>
                <div className={styles.reviewContent}>
                  {review.content}
                </div>
                {review.images && review.images.length > 0 && (
                  <div className={styles.reviewImages}>
                    {review.images.map((img, index) => (
                      <img
                        key={index}
                        src={img.imageData ? `data:image/jpeg;base64,${img.imageData}` : ''}
                        alt={`Review ${index + 1}`}
                        className={styles.reviewImage}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProductDetail;

