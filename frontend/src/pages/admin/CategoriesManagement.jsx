import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import styles from './CategoriesManagement.module.css';

function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllCategories();
      const categoriesData = response.data || [];
      setCategories(categoriesData);
      
      // Load stats for each category
      const statsPromises = categoriesData.map(async (category) => {
        try {
          const infoResponse = await adminAPI.getCategoryInfo(category.id);
          return {
            id: category.id,
            totalProducts: infoResponse.data.totalProducts || 0,
            activeProducts: infoResponse.data.activeProducts || 0
          };
        } catch (error) {
          console.error(`Error loading stats for category ${category.id}:`, error);
          return {
            id: category.id,
            totalProducts: 0,
            activeProducts: 0
          };
        }
      });
      
      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.id] = {
          totalProducts: stat.totalProducts,
          activeProducts: stat.activeProducts
        };
      });
      setCategoryStats(statsMap);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Có lỗi khi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = [...categories];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cat =>
        cat.name?.toLowerCase().includes(term) ||
        cat.id.toString().includes(term)
      );
    }

    // Sort by id
    filtered.sort((a, b) => a.id - b.id);

    setFilteredCategories(filtered);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setSubmitting(true);
      const response = await adminAPI.createCategory({ name: formData.name.trim() });
      console.log('Create category response:', response);
      
      // Backend trả về {success, message, data, error}
      if (response && response.success !== false) {
        await loadCategories();
        setIsAddModalOpen(false);
        setFormData({ name: '' });
        alert('Thêm danh mục thành công!');
      } else {
        const errorMsg = response?.message || response?.error || 'Có lỗi khi thêm danh mục';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message || 
                      'Có lỗi khi thêm danh mục';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setSubmitting(true);
      const response = await adminAPI.updateCategory(selectedCategory.id, { 
        name: formData.name.trim()
      });
      console.log('Update category response:', response);
      
      // Backend trả về {success, message, data, error}
      if (response && response.success !== false) {
        await loadCategories();
        setIsEditModalOpen(false);
        setSelectedCategory(null);
        setFormData({ name: '' });
        alert('Cập nhật danh mục thành công!');
      } else {
        const errorMsg = response?.message || response?.error || 'Có lỗi khi cập nhật danh mục';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message || 
                      'Có lỗi khi cập nhật danh mục';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?\n\nLưu ý: Hành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      await adminAPI.deleteCategory(category.id);
      await loadCategories();
      alert('Xóa danh mục thành công!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Có lỗi khi xóa danh mục. Có thể danh mục này đang được sử dụng.');
    }
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name });
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({ name: '' });
    setIsAddModalOpen(true);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách danh mục...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Danh mục</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm danh mục
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tổng số:</span>
          <span className={styles.statValue}>{categories.length}</span>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className={styles.emptyState}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>Không tìm thấy danh mục nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục</th>
                <th>Tổng sản phẩm</th>
                <th>Sản phẩm đang bán</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => {
                const stats = categoryStats[category.id] || { totalProducts: 0, activeProducts: 0 };
                return (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td className={styles.categoryName}>{category.name}</td>
                    <td>
                      <span className={styles.productCount}>{stats.totalProducts}</span>
                    </td>
                    <td>
                      <span className={styles.activeProductCount}>{stats.activeProducts}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditModal(category)}
                          title="Sửa"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteCategory(category)}
                          title="Xóa"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className={styles.modal} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Thêm danh mục mới</h2>
              <button className={styles.closeButton} onClick={() => setIsAddModalOpen(false)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className={styles.formGroup}>
                <label>Tên danh mục</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Nhập tên danh mục..."
                  required
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? 'Đang thêm...' : 'Thêm danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedCategory && (
        <div className={styles.modal} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Sửa danh mục</h2>
              <button className={styles.closeButton} onClick={() => setIsEditModalOpen(false)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditCategory}>
              <div className={styles.formGroup}>
                <label>Tên danh mục</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Nhập tên danh mục..."
                  required
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesManagement;

