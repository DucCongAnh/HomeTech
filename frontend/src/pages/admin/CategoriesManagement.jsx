// src/pages/admin/OrdersManagement.jsx
import { useState, useEffect } from 'react';
import styles from './CategoriesManagement.module.css'; // Dùng chung style cho đồng bộ

const ORDER_STATUS = {
  WAITING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const STATUS_COLOR = {
  WAITING_CONFIRMATION: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    waiting: 0,
    confirmed: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Gọi 5 endpoint trạng thái và gộp lại (vì chưa có /admin/all)
      const statuses = Object.keys(ORDER_STATUS);
      const requests = statuses.map(status =>
        fetch(`/api/orders/admin/status/${status}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : { success: false, data: [] })
      );

      const responses = await Promise.all(requests);
      let allOrders = [];
      const stats = { total: 0, waiting: 0, confirmed: 0, shipped: 0, completed: 0, cancelled: 0 };

      responses.forEach((resp, index) => {
        const statusKey = statuses[index];
        const data = resp.success ? resp.data : [];
        allOrders = allOrders.concat(data);

        stats.total += data.length;
        if (statusKey === 'WAITING_CONFIRMATION') stats.waiting += data.length;
        if (statusKey === 'CONFIRMED') stats.confirmed += data.length;
        if (statusKey === 'SHIPPED') stats.shipped += data.length;
        if (statusKey === 'COMPLETED') stats.completed += data.length;
        if (statusKey === 'CANCELLED') stats.cancelled += data.length;
      });

      // Sắp xếp mới nhất lên đầu
      allOrders.sort((a, b) => b.id - a.id);

      setOrders(allOrders);
      setOrderStats(stats);
    } catch (error) {
      console.error('Lỗi tải đơn hàng:', error);
      alert('Có lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toString().includes(term) ||
        order.customer?.username?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const updateStatus = async (orderId, newStatus) => {
    if (!window.confirm(`Chuyển trạng thái đơn hàng #${orderId} sang "${ORDER_STATUS[newStatus]}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/orders/${orderId}/status?newStatus=${newStatus}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        loadOrders(); // reload lại toàn bộ
        setSelectedOrder(data.data);
        alert('Cập nhật trạng thái thành công!');
      } else {
        alert(data.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${orderId}?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/orders/${orderId}/cancel/admin`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        loadOrders();
        setSelectedOrder(data.data);
        alert('Hủy đơn thành công');
      }
    } catch (error) {
      alert('Hủy đơn thất bại');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Đơn hàng</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.controls} style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tổng đơn</span>
          <span className={styles.statValue}>{orderStats.total}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Chờ xác nhận</span>
          <span className={styles.statValue} style={{ color: '#d97706' }}>{orderStats.waiting}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Đang giao</span>
          <span className={styles.statValue} style={{ color: '#7c3aed' }}>{orderStats.shipped}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Hoàn thành</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>{orderStats.completed}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Đã hủy</span>
          <span className={styles.statValue} style={{ color: '#dc2626' }}>{orderStats.cancelled}</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox} style={{ maxWidth: '400px', marginBottom: '2rem' }}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm theo ID hoặc tên khách..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>Không tìm thấy đơn hàng nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày đặt</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ cursor: 'pointer' }}>
                  <td>#{order.id}</td>
                  <td className={styles.categoryName}>
                    {order.customer?.username || 'Khách lẻ'}
                  </td>
                  <td>{Number(order.totalAmount).toLocaleString('vi-VN')} ₫</td>
                  <td>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {ORDER_STATUS[order.status] || order.status}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                      className={styles.actionButton}
                      title="Xem chi tiết"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal chi tiết đơn hàng - giống hệt modal của Categories */}
      {selectedOrder && (
        <div className={styles.modal} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chi tiết đơn hàng #{selectedOrder.id}</h2>
              <button className={styles.closeButton} onClick={() => setSelectedOrder(null)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <p><strong>Khách hàng:</strong> {selectedOrder.customer?.username || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedOrder.customer?.email || 'N/A'}</p>
                <p><strong>Địa chỉ:</strong> {selectedOrder.deliveryAddress?.fullAddress || 'Chưa có'}</p>
              </div>
              <div>
                <p><strong>Tổng tiền:</strong> {Number(selectedOrder.totalAmount).toLocaleString('vi-VN')} ₫</p>
                <p><strong>Trạng thái:</strong> <span className={STATUS_COLOR[selectedOrder.status]}>{ORDER_STATUS[selectedOrder.status]}</span></p>
                <p><strong>Ngày đặt:</strong> {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-4">Sản phẩm trong đơn</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="text-left px-4 py-3">Sản phẩm</th>
                  <th className="text-center px-4 py-3">SL</th>
                  <th className="text-right px-4 py-3">Giá</th>
                  <th className="text-right px-4 py-3">Tổng</th>
                </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3">{item.product.name}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{Number(item.price).toLocaleString('vi-VN')} ₫</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  )) || <tr><td colSpan="4" className="text-center py-8 text-gray-500">Không có sản phẩm</td></tr>}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions} style={{ marginTop: '2rem' }}>
              {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                <>
                  {selectedOrder.status === 'WAITING_CONFIRMATION' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'CONFIRMED')} className={styles.submitButton}>
                      Xác nhận đơn
                    </button>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'SHIPPED')} className={styles.submitButton}>
                      Đang giao
                    </button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'COMPLETED')} className={styles.submitButton}>
                      Hoàn thành
                    </button>
                  )}
                  <button onClick={() => cancelOrder(selectedOrder.id)} className={`${styles.submitButton} ${styles.deleteButton || ''}`} style={{ background: '#dc2626' }}>
                    Hủy đơn
                  </button>
                </>
              )}
              <button onClick={() => setSelectedOrder(null)} className={styles.cancelButton}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}