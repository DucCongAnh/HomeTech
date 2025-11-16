import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './OAuthCallback.module.css';

function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Sau khi OAuth2 login thành công, backend đã tạo session
        // Kiểm tra xem có OAuth2 user không
        const response = await api.get('/auth/oauth2/user');
        
        if (response.data.success) {
          // Lấy thông tin user từ OAuth2
          const userData = response.data.data;
          
          // Lưu thông tin user vào localStorage
          localStorage.setItem('email', userData.email || '');
          localStorage.setItem('username', userData.name || userData.email || '');
          localStorage.setItem('role', 'USER');
          
          // Redirect về trang chủ
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          setError('Không thể lấy thông tin người dùng từ OAuth2');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('OAuth2 callback error:', err);
        // Có thể user đã đăng nhập thành công nhưng chưa có token
        // Thử redirect về trang chủ
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.spinner}></div>
            <p className={styles.message}>Đang xử lý đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.errorIcon}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className={styles.errorTitle}>Lỗi</h3>
            <p className={styles.errorMessage}>{error}</p>
            <button
              onClick={() => navigate('/login')}
              className={styles.button}
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default OAuthCallback;

