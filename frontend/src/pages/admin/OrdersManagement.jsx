import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import styles from './OrdersManagement.module.css';

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
    loadOrderStatuses();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStatuses = async () => {
    try {
      const response = await adminAPI.getOrderStatuses();
      setOrderStatuses(response.data || []);
    } catch (error) {
      console.error('Error loading order statuses:', error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toString().includes(term) ||
        order.user?.account?.email?.toLowerCase().includes(term) ||
        order.user?.fullName?.toLowerCase().includes(term)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    setFilteredOrders(filtered);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (!window.confirm('Bạn có chắc chắn muốn thay đổi trạng thái đơn hàng này?')) {
      return;
    }

    try {
      setUpdating(true);
      await adminAPI.updateOrderStatus(orderId, newStatus);
      await loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
      console.error('Error updating order status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      WAITING_CONFIRMATION: { label: 'Chờ xác nhận', color: 'yellow' },
      CONFIRMED: { label: 'Đã xác nhận', color: 'blue' },
      SHIPPED: { label: 'Đang giao', color: 'purple' },
      COMPLETED: { label: 'Hoàn thành', color: 'green' },
      CANCELLED: { label: 'Đã hủy', color: 'red' },
    };
    const statusInfo = statusMap[status] || { label: status, color: 'gray' };
    return (
      <span className={`${styles.statusBadge} ${styles[statusInfo.color]}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      WAITING_CONFIRMATION: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      SHIPPED: 'Đang giao',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý đơn hàng</h1>
          <p className={styles.subtitle}>Tổng cộng: {filteredOrders.length} đơn hàng</p>
        </div>
        <button onClick={loadOrders} className={styles.refreshBtn}>
          <svg className={styles.refreshIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn, email, tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.statusSelect}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {orderStatuses.map(status => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className={styles.tableContainer}>
        {filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Không tìm thấy đơn hàng nào</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderId}>#{order.id}</td>
                  <td>
                    <div>
                      <p className={styles.customerName}>
                        {order.user?.fullName || 'N/A'}
                      </p>
                      <p className={styles.customerEmail}>
                        {order.user?.account?.email || 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td className={styles.amount}>{formatCurrency(order.totalAmount || 0)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className={styles.viewBtn}
                      >
                        Xem
                      </button>
                      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={styles.statusSelectSmall}
                          disabled={updating}
                        >
                          {orderStatuses
                            .filter(s => s !== order.status)
                            .map(status => (
                              <option key={status} value={status}>
                                {getStatusLabel(status)}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chi tiết đơn hàng #{selectedOrder.id}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className={styles.closeBtn}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h3>Thông tin khách hàng</h3>
                <p><strong>Họ tên:</strong> {selectedOrder.user?.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedOrder.user?.account?.email || 'N/A'}</p>
                <p><strong>Địa chỉ:</strong> {selectedOrder.address?.address || 'N/A'}</p>
              </div>
              <div className={styles.detailSection}>
                <h3>Thông tin đơn hàng</h3>
                <p><strong>Ngày đặt:</strong> {formatDate(selectedOrder.orderDate)}</p>
                <p><strong>Trạng thái:</strong> {getStatusBadge(selectedOrder.status)}</p>
                <p><strong>Phương thức thanh toán:</strong> {selectedOrder.paymentMethod || 'N/A'}</p>
                <p><strong>Tổng tiền:</strong> {formatCurrency(selectedOrder.totalAmount || 0)}</p>
              </div>
              {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                <div className={styles.detailSection}>
                  <h3>Sản phẩm</h3>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.orderItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product?.name || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price || 0)}</td>
                          <td>{formatCurrency((item.price || 0) * (item.quantity || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersManagement;


