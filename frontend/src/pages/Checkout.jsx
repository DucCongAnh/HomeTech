import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Checkout.module.css';
import api, { userAPI, paymentAPI } from '../services/api';

const PAYMENT_OPTIONS = [
  {
    id: 'COD',
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Thanh toán trực tiếp cho tài xế khi nhận hàng.',
    comingSoon: false,
  },
  {
    id: 'VNPAY',
    label: 'VNPAY',
    description: 'Thanh toán nhanh qua cổng VNPAY.',
    comingSoon: false,
  },
  {
    id: 'MOMO',
    label: 'Ví MoMo',
    description: 'Đang phát triển',
    comingSoon: true,
  },
  {
    id: 'CARD',
    label: 'Thẻ ngân hàng / Visa / MasterCard',
    description: 'Đang phát triển',
    comingSoon: true,
  },
];

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function Checkout() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [voucherCode, setVoucherCode] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userInfo?.id) {
      loadCart(userInfo.id);
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
      if (response.data?.success) {
        setUserInfo(response.data.data);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('loadUserInfo error:', error);
      navigate('/login');
    }
  };

  const loadCart = async (userId) => {
    try {
      setLoading(true);
      const response = await userAPI.getCart(userId);
      setCartItems(response.data || []);
    } catch (error) {
      console.error('loadCart error:', error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        if (item.product?.price) {
          return sum + item.product.price * item.quantity;
        }
        return sum;
      }, 0),
    [cartItems]
  );

  const getPaymentLabel = () => {
    const option = PAYMENT_OPTIONS.find((opt) => opt.id === paymentMethod);
    return option?.label || 'Thanh toán';
  };

  const handlePlaceOrder = async () => {
    if (!userInfo?.id) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      alert('Giỏ hàng của bạn đang trống.');
      return;
    }
    try {
      setPlacingOrder(true);
      const response = await userAPI.createOrder(userInfo.id, {
        voucherCode: voucherCode.trim() || undefined,
        paymentMethod,
      });
      if (response?.success === false) {
        throw new Error(response?.error || response?.message || 'Không thể tạo đơn hàng');
      }
      const createdOrder = response?.data;
      if (!createdOrder?.id) {
        throw new Error('Không lấy được thông tin đơn hàng');
      }

      if (paymentMethod === 'VNPAY') {
        const paymentResponse = await paymentAPI.createVnPayPayment(createdOrder?.id);
        if (!paymentResponse?.success || !paymentResponse?.paymentUrl) {
          throw new Error(paymentResponse?.message || 'Không thể khởi tạo thanh toán VNPAY');
        }
        window.location.href = paymentResponse.paymentUrl;
        return;
      }

      alert('Đặt hàng thành công! Chúng tôi sẽ liên hệ trong thời gian sớm nhất.');
      navigate('/orders');
    } catch (error) {
      console.error('handlePlaceOrder error:', error);
      alert(error?.response?.data?.error || error.message || 'Không thể đặt hàng');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          HomeTech
        </Link>
        <div className={styles.headerActions}>
          <Link to="/cart">Giỏ hàng</Link>
          <Link to="/orders">Đơn hàng</Link>
        </div>
      </header>

      <div className={styles.checkoutLayout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Thông tin nhận hàng</h2>
              <Link to="/profile">Chỉnh sửa</Link>
            </div>
            <div className={styles.addressBox}>
              <p className={styles.addressName}>{userInfo?.fullName || userInfo?.username}</p>
              <p className={styles.addressPhone}>{userInfo?.phone || 'Chưa cập nhật'}</p>
              <p className={styles.addressLine}>
                {[
                  userInfo?.addressLine,
                  userInfo?.commune,
                  userInfo?.district,
                  userInfo?.city,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Chưa có địa chỉ giao hàng. Vui lòng cập nhật hồ sơ.'}
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Sản phẩm</h2>
              <Link to="/cart">Chỉnh sửa giỏ hàng</Link>
            </div>
            <div className={styles.itemsList}>
              {cartItems.length === 0 && (
                <p className={styles.emptyState}>Giỏ hàng của bạn đang trống</p>
              )}
              {cartItems.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.product?.name || 'Sản phẩm'}</p>
                    <span className={styles.itemQuantity}>x{item.quantity}</span>
                  </div>
                  <div className={styles.itemPrice}>
                    {formatCurrency(item.product?.price || 0)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Phương thức thanh toán</h2>
            </div>
            <div className={styles.paymentMethods}>
              {PAYMENT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`${styles.paymentOption} ${
                    paymentMethod === option.id ? styles.paymentOptionActive : ''
                  } ${option.comingSoon ? styles.paymentOptionDisabled : ''}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    disabled={option.comingSoon}
                    checked={paymentMethod === option.id}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  <div>
                    <p className={styles.paymentLabel}>
                      {option.label}
                      {option.comingSoon && <span className={styles.badge}>Sắp ra mắt</span>}
                    </p>
                    <p className={styles.paymentDescription}>{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Đơn hàng</h2>
            </div>
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Phí vận chuyển</span>
              <span>Miễn phí</span>
            </div>
            <div className={styles.summaryRow}>
              <label htmlFor="voucherCode">Voucher</label>
              <input
                id="voucherCode"
                type="text"
                placeholder="Nhập mã nếu có"
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value)}
              />
            </div>
            <div className={styles.summaryTotal}>
              <span>Tổng cộng</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <button
              className={styles.placeOrderButton}
              onClick={handlePlaceOrder}
              disabled={placingOrder || cartItems.length === 0}
            >
              {placingOrder
                ? 'Đang xử lý...'
                : `${getPaymentLabel()} (${formatCurrency(subtotal)})`}
            </button>
            <p className={styles.notice}>
              Bằng việc đặt hàng, bạn đồng ý với{' '}
              <Link to="/terms" className={styles.link}>
                Điều khoản dịch vụ
              </Link>{' '}
              của HomeTech.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

