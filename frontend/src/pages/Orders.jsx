import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import api from '../services/api';
import styles from './Orders.module.css';

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.id) {
      loadOrders();
    }
  }, [userInfo]);

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await api.get('/auth/user-info');
      if (response.data.success) {
        setUserInfo(response.data.data);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/login');
      }
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getOrders(userInfo.id);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'PENDING': '#f59e0b',
      'CONFIRMED': '#3b82f6',
      'SHIPPING': '#8b5cf6',
      'DELIVERED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return statusMap[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'SHIPPING': 'Đang giao hàng',
      'DELIVERED': 'Đã giao hàng',
      'CANCELLED': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>HomeTech</span>
          </Link>
          <Link to="/" className={styles.backButton}>
            ← Về trang chủ
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>Đơn hàng của tôi</h1>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Bạn chưa có đơn hàng nào</p>
            <Link to="/" className={styles.shopButton}>
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderId}>Đơn hàng #{order.id}</div>
                    <div className={styles.orderDate}>{formatDate(order.createdAt)}</div>
                  </div>
                  <div
                    className={styles.orderStatus}
                    style={{ color: getStatusColor(order.status) }}
                  >
                    {getStatusText(order.status)}
                  </div>
                </div>

                <div className={styles.orderItems}>
                  {order.orderItems?.map((item, index) => (
                    <div key={index} className={styles.orderItem}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{item.product?.name || 'N/A'}</div>
                        <div className={styles.itemDetails}>
                          Số lượng: {item.quantity} × {formatPrice(item.price)}
                        </div>
                      </div>
                      <div className={styles.itemTotal}>
                        {formatPrice(item.quantity * item.price)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.orderFooter}>
                  <div className={styles.orderTotal}>
                    <strong>Tổng tiền: {formatPrice(order.totalAmount)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;

