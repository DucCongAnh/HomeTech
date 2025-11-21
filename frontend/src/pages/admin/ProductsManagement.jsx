// src/pages/admin/ProductsManagement.jsx
import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import styles from './ProductsManagement.module.css';

const defaultFormState = {
  name: '',
  price: '',
  stock: '',
  description: '',
  category: { id: '' },
  hidden: false,
};

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'ALL',
    visibility: 'ALL',
  });
  const [form, setForm] = useState(defaultFormState);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadProducts(), loadCategories()]);
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const response = await adminAPI.getAllProducts();
      if (response.success) {
        setProducts(response.data || []);
      } else {
        throw new Error(response.message || 'Không thể tải sản phẩm');
      }
    } catch (error) {
      console.error('loadProducts error:', error);
      alert(error.message || 'Lỗi tải danh sách sản phẩm');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await adminAPI.getAllCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('loadCategories error:', error);
    }
  };

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => !p.hidden).length;
    const hidden = total - active;
    const lowStock = products.filter((p) => Number(p.stock) <= 5).length;
    return { total, active, hidden, lowStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchSearch =
        !filters.search ||
        product.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.id?.toString().includes(filters.search);

      const matchCategory =
        filters.category === 'ALL' ||
        product.category?.id?.toString() === filters.category;

      const matchVisibility =
        filters.visibility === 'ALL' ||
        (filters.visibility === 'VISIBLE' && !product.hidden) ||
        (filters.visibility === 'HIDDEN' && product.hidden);

      return matchSearch && matchCategory && matchVisibility;
    });
  }, [products, filters]);

  const fetchProductImages = async (productId) => {
    setLoadingImages(true);
    try {
      const response = await adminAPI.getProductImages(productId);
      if (response.success) {
        setExistingImages(response.data || []);
      } else {
        throw new Error(response.message || 'Không thể tải ảnh sản phẩm');
      }
    } catch (error) {
      console.error('fetchProductImages error:', error);
      alert(error.message || 'Không thể tải ảnh sản phẩm');
    } finally {
      setLoadingImages(false);
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name || '',
        price: product.price ?? '',
        stock: product.stock ?? '',
        description: product.description || '',
        category: { id: product.category?.id?.toString() || '' },
        hidden: product.hidden ?? false,
      });
      fetchProductImages(product.id);
    } else {
      setEditingProduct(null);
      setForm(defaultFormState);
      setExistingImages([]);
    }
    setSelectedImages([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
    setEditingProduct(null);
    setForm(defaultFormState);
    setSelectedImages([]);
    setExistingImages([]);
  };

  const handleInputChange = (field, value) => {
    if (field === 'category') {
      setForm((prev) => ({ ...prev, category: { id: value } }));
    } else if (field === 'hidden') {
      setForm((prev) => ({ ...prev, hidden: value }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages(files);
  };

  useEffect(() => {
    if (selectedImages.length === 0) {
      setImagePreviews([]);
      return;
    }

    const previews = selectedImages.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImagePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedImages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.category.id) {
      alert('Vui lòng chọn danh mục');
      return;
    }

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    };

    try {
      setSubmitting(true);
      let productId = editingProduct?.id;

      if (editingProduct) {
        const response = await adminAPI.updateProduct(editingProduct.id, payload);
        if (!response.success) throw new Error(response.message);
        alert('Cập nhật sản phẩm thành công');
      } else {
        const response = await adminAPI.createProduct(payload);
        if (!response.success) throw new Error(response.message);
        productId = response.data?.id;
        if (!productId) {
          throw new Error('Không nhận được ID sản phẩm sau khi tạo');
        }
        if (selectedImages.length > 0) {
          const uploadResponse = await adminAPI.uploadProductImages(productId, selectedImages);
          if (!uploadResponse.success) {
            throw new Error(uploadResponse.message || 'Không thể upload ảnh sản phẩm');
          }
        }
        alert('Thêm sản phẩm thành công');
      }
      if (editingProduct && selectedImages.length > 0) {
        const uploadResponse = await adminAPI.uploadProductImages(productId, selectedImages);
        if (!uploadResponse.success) {
          throw new Error(uploadResponse.message || 'Không thể upload ảnh sản phẩm');
        }
      }
      await loadProducts();
      closeModal();
    } catch (error) {
      console.error('handleSubmit error:', error);
      alert(error.message || 'Có lỗi xảy ra');
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Hành động không thể hoàn tác.')) {
      return;
    }
    try {
      const response = await adminAPI.deleteProduct(productId);
      if (!response.success) throw new Error(response.message);
      alert('Đã xóa sản phẩm');
      await loadProducts();
    } catch (error) {
      alert(error.message || 'Không thể xóa sản phẩm');
    }
  };

  const handleDeleteImage = async (event, imageId) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
      return;
    }
    try {
      const response = await adminAPI.deleteProductImage(imageId);
      if (!response.success) throw new Error(response.message);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      if (editingProduct?.id) {
        await fetchProductImages(editingProduct.id);
      }
      alert('Đã xóa ảnh');
    } catch (error) {
      console.error('handleDeleteImage error:', error);
      alert(error.message || 'Không thể xóa ảnh');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý sản phẩm</h1>
        <button className={styles.addButton} onClick={() => openModal()}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm sản phẩm
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tổng số</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Đang hiển thị</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>{stats.active}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Đang ẩn</span>
          <span className={styles.statValue} style={{ color: '#f97316' }}>{stats.hidden}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Sắp hết hàng (&lt;=5)</span>
          <span className={styles.statValue} style={{ color: '#dc2626' }}>{stats.lowStock}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2m1.7-4.5a6.2 6.2 0 11-12.4 0 6.2 6.2 0 0112.4 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo ID, tên sản phẩm..."
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </div>

        <select
          value={filters.category}
          onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="ALL">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={filters.visibility}
          onChange={(event) => setFilters((prev) => ({ ...prev, visibility: event.target.value }))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="VISIBLE">Đang hiển thị</option>
          <option value="HIDDEN">Đang ẩn</option>
        </select>
      </div>

  {filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 018 0v2m-7-8a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p>Không tìm thấy sản phẩm phù hợp</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sản phẩm</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Danh mục</th>
                <th>Hiển thị</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>#{product.id}</td>
                  <td className={styles.categoryName}>{product.name}</td>
                  <td>{Number(product.price).toLocaleString('vi-VN')} ₫</td>
                  <td>{product.stock}</td>
                  <td>{product.category?.name || '—'}</td>
                  <td>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${product.hidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {product.hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => openModal(product)}
                      title="Chỉnh sửa"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m2 0h2m-6 4h6m-6 4h6m-6 4h6" />
                      </svg>
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDeleteProduct(product.id)}
                      title="Xóa sản phẩm"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Tên sản phẩm</label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  placeholder="Nhập tên sản phẩm"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Giá bán (₫)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={form.price}
                  onChange={(event) => handleInputChange('price', event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tồn kho</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.stock}
                  onChange={(event) => handleInputChange('stock', event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Danh mục</label>
                <select
                  required
                  value={form.category.id}
                  onChange={(event) => handleInputChange('category', event.target.value)}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Mô tả</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => handleInputChange('description', event.target.value)}
                  placeholder="Mô tả ngắn gọn/đầy đủ về sản phẩm"
                />
              </div>

              {editingProduct && (
                <div className={styles.formGroup}>
                  <label>Ảnh đang lưu</label>
                  {loadingImages ? (
                    <p className={styles.helperText}>Đang tải ảnh...</p>
                  ) : existingImages.length === 0 ? (
                    <p className={styles.helperText}>Hiện chưa có ảnh cho sản phẩm này.</p>
                  ) : (
                    <div className={styles.imagePreviewGrid}>
                      {existingImages.map((image) => (
                        <div key={image.id} className={styles.imagePreview}>
                          <button
                            type="button"
                            className={styles.deleteImageButton}
                            onClick={(event) => handleDeleteImage(event, image.id)}
                            title="Xóa ảnh này"
                          >
                            ×
                          </button>
                          <img
                            src={`data:image/*;base64,${image.imageData}`}
                            alt={image.fileName || `Ảnh #${image.id}`}
                          />
                          <span>{image.fileName || `Ảnh #${image.id}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Ảnh sản phẩm</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                {imagePreviews.length > 0 && (
                  <div className={styles.imagePreviewGrid}>
                    {imagePreviews.map((preview, index) => (
                      <div key={`${preview.name}-${index}`} className={styles.imagePreview}>
                        <img src={preview.url} alt={preview.name} />
                        <span>{preview.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className={styles.helperText}>
                  {editingProduct
                    ? 'Ảnh mới sẽ được thêm sau khi nhấn lưu.'
                    : 'Ảnh sẽ được tải lên ngay sau khi tạo sản phẩm.'}
                </p>
              </div>

              <div className={styles.formGroup}>
                <label>Trạng thái hiển thị</label>
                <select
                  value={form.hidden ? 'HIDDEN' : 'VISIBLE'}
                  onChange={(event) => handleInputChange('hidden', event.target.value === 'HIDDEN')}
                >
                  <option value="VISIBLE">Hiển thị</option>
                  <option value="HIDDEN">Ẩn sản phẩm</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}