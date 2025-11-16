import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import styles from './Dashboard.module.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalCategories: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [ordersRes, productsRes, categoriesRes] = await Promise.all([
        adminAPI.getAllOrders().catch(() => ({ data: [] })),
        adminAPI.getAllProducts().catch(() => ({ data: [] })),
        adminAPI.getAllCategories().catch(() => ({ data: [] })),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const categories = categoriesRes.data || [];

      // Calculate stats
      const pendingOrders = orders.filter(o => 
        o.status === 'WAITING_CONFIRMATION' || o.status === 'CONFIRMED'
      ).length;
      const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
      const activeProducts = products.filter(p => !p.hidden).length;

      setStats({
        totalOrders: orders.length,
        totalProducts: products.length,
        totalUsers: 0, // Will need API endpoint
        totalCategories: categories.length,
        pendingOrders,
        completedOrders,
        activeProducts,
      });

      // Get recent orders (last 5)
      const sortedOrders = [...orders]
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 5);
      setRecentOrders(sortedOrders);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Tổng quan hệ thống</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.primary}`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tổng đơn hàng</p>
            <p className={styles.statValue}>{stats.totalOrders}</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tổng sản phẩm</p>
            <p className={styles.statValue}>{stats.totalProducts}</p>
            <p className={styles.statSubtext}>{stats.activeProducts} đang hoạt động</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tổng người dùng</p>
            <p className={styles.statValue}>{stats.totalUsers}</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Danh mục</p>
            <p className={styles.statValue}>{stats.totalCategories}</p>
          </div>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Đơn hàng chờ xử lý</h3>
          <p className={styles.summaryValue}>{stats.pendingOrders}</p>
        </div>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Đơn hàng hoàn thành</h3>
          <p className={styles.summaryValue}>{stats.completedOrders}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className={styles.recentOrders}>
        <h2 className={styles.sectionTitle}>Đơn hàng gần đây</h2>
        {recentOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className={styles.ordersTable}>
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user?.account?.email || 'N/A'}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatCurrency(order.totalAmount || 0)}</td>
                    <td>{getStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;


