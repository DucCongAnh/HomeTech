import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI, authAPI } from '../services/api';
import api from '../services/api';
import styles from './Home.module.css';

function Home() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user info, products, categories, top selling in parallel
      const [userRes, productsRes, categoriesRes, topSellingRes] = await Promise.all([
        api.get('/auth/user-info').catch(() => ({ data: { success: false } })),
        userAPI.getAllProducts().catch(() => ({ data: [] })),
        userAPI.getAllCategories().catch(() => ({ data: [] })),
        userAPI.getTopSelling().catch(() => ({ data: [] }))
      ]);

      if (userRes.data.success) {
        setUserInfo(userRes.data.data);
      }

      const allProducts = productsRes.data || [];
      // Chỉ lấy sản phẩm active (hidden = false)
      const activeProducts = allProducts.filter(p => !p.hidden);
      setProducts(activeProducts);
      
      setCategories(categoriesRes.data || []);
      setTopSelling(topSellingRes.data || []);

      // Load images for all products
      const imagePromises = activeProducts.map(async (product) => {
        try {
          const imagesRes = await userAPI.getProductImages(product.id);
          // imagesRes là {success: true, data: [...], message: "..."}
          const images = imagesRes.data || [];
          
          console.log(`[DEBUG] Product ${product.id}:`, {
            fullResponse: imagesRes,
            imagesArray: images,
            imagesLength: images.length
          });
          
          if (images.length > 0) {
            // Lấy ảnh đầu tiên
            const firstImage = images[0];
            
            console.log(`[DEBUG] Product ${product.id} - First image object:`, {
              id: firstImage.id,
              fileName: firstImage.fileName,
              hasImageData: !!firstImage.imageData,
              imageDataType: typeof firstImage.imageData,
              imageDataLength: firstImage.imageData?.length,
              imageDataPreview: firstImage.imageData?.substring(0, 100)
            });
            
            let imageUrl = null;
            
            if (firstImage && firstImage.imageData) {
              const imageData = firstImage.imageData;
              
              if (typeof imageData === 'string' && imageData.trim().length > 0) {
                // Thêm prefix data URL nếu chưa có
                if (imageData.startsWith('data:')) {
                  imageUrl = imageData;
                } else {
                  imageUrl = `data:image/jpeg;base64,${imageData}`;
                }
                console.log(`[SUCCESS] Product ${product.id} - Image URL created, length: ${imageUrl.length}`);
              } else {
                console.warn(`[WARN] Product ${product.id} - imageData is not a valid string:`, imageData);
              }
            } else {
              console.warn(`[WARN] Product ${product.id} - No imageData in firstImage`);
            }
            
            return {
              productId: product.id,
              imageUrl: imageUrl
            };
          } else {
            console.warn(`[WARN] Product ${product.id} - No images returned from API`);
          }
        } catch (err) {
          console.error(`[ERROR] Product ${product.id} - Error:`, err);
        }
        return { productId: product.id, imageUrl: null };
      });

      const images = await Promise.all(imagePromises);
      const imagesMap = {};
      images.forEach(img => {
        if (img && img.imageUrl) {
          imagesMap[img.productId] = img.imageUrl;
          console.log(`[FINAL] Product ${img.productId} - Image URL set:`, img.imageUrl.substring(0, 50) + '...');
        } else {
          console.warn(`[FINAL] Product ${img?.productId} - No image URL`);
        }
      });
      console.log('[FINAL] Complete imagesMap:', Object.keys(imagesMap).map(id => ({ id, hasUrl: !!imagesMap[id] })));
      setProductImages(imagesMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.clear();
      navigate('/login');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchKeyword.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const response = await userAPI.searchProducts(searchKeyword);
      const searchResults = response.data || [];
      setProducts(searchResults.filter(p => !p.hidden));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  if (loading && products.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
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

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <button type="submit" className={styles.searchButton}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          <div className={styles.headerActions}>
            {userInfo ? (
              <>
                <span className={styles.username}>{userInfo.username}</span>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className={styles.loginButton}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Categories Navigation */}
      {categories.length > 0 && (
        <nav className={styles.categoriesNav}>
          <div className={styles.categoriesContent}>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className={styles.categoryLink}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Banner */}
      <section className={styles.banner}>
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>Chào mừng đến với HomeTech</h1>
          <p className={styles.bannerSubtitle}>Thiết bị gia đình thông minh - Chất lượng hàng đầu</p>
        </div>
      </section>

      {/* Top Selling Products */}
      {topSelling.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sản phẩm bán chạy</h2>
          </div>
          <div className={styles.productsGrid}>
            {topSelling.slice(0, 8).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={styles.productCard}
              >
                <div className={styles.productImageContainer}>
                  {productImages[product.id] ? (
                    <>
                      <img
                        key={`img-${product.id}-${productImages[product.id]?.substring(0, 20)}`}
                        src={productImages[product.id]}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => {
                          console.error(`[IMG ERROR] Product ${product.id}:`, {
                            src: productImages[product.id]?.substring(0, 100),
                            error: e
                          });
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          console.log(`[IMG SUCCESS] Product ${product.id} - Image loaded`);
                        }}
                      />
                      <div className={styles.productImagePlaceholder} style={{ display: 'none' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {product.soldCount > 0 && (
                    <div className={styles.badge}>Bán chạy</div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>{formatPrice(product.price)}</div>
                  {product.soldCount > 0 && (
                    <div className={styles.productSold}>Đã bán: {product.soldCount}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Products */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tất cả sản phẩm</h2>
        </div>
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={styles.productCard}
              >
                <div className={styles.productImageContainer}>
                  {productImages[product.id] ? (
                    <>
                      <img
                        key={`img-all-${product.id}-${productImages[product.id]?.substring(0, 20)}`}
                        src={productImages[product.id]}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => {
                          console.error(`[IMG ERROR] Product ${product.id}:`, {
                            src: productImages[product.id]?.substring(0, 100),
                            error: e
                          });
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          console.log(`[IMG SUCCESS] Product ${product.id} - Image loaded`);
                        }}
                      />
                      <div className={styles.productImagePlaceholder} style={{ display: 'none' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>{formatPrice(product.price)}</div>
                  {product.soldCount > 0 && (
                    <div className={styles.productSold}>Đã bán: {product.soldCount}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
