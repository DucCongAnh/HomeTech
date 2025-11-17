import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import api from '../../services/api';
import styles from './UsersManagement.module.css';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      console.log('Users API response:', response);
      
      // adminAPI.getAllUsers() trả về response.data từ axios
      // response.data từ backend là List<User> trực tiếp
      let usersData = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else {
        usersData = [];
      }
      
      console.log('Parsed users data:', usersData);
      console.log('Number of users:', usersData.length);
      
      if (usersData.length === 0) {
        console.warn('No users found in response');
        setUsers([]);
        return;
      }
      
      // Filter only customers (not admins)
      // Role có thể là enum string "USER" hoặc object
      const customers = usersData.filter(user => {
        if (!user) {
          return false;
        }
        
        // Nếu không có account, bỏ qua
        if (!user.account) {
          console.log('User', user.id, 'has no account');
          return false;
        }
        
        // Check role - có thể là string "USER" hoặc enum object
        const role = user.account.role;
        let roleString = '';
        if (typeof role === 'string') {
          roleString = role;
        } else if (role && typeof role === 'object') {
          roleString = role.name || role.toString();
        } else if (role !== null && role !== undefined) {
          roleString = String(role);
        }
        
        console.log('User', user.id, 'role:', roleString, 'account:', user.account);
        // Check if role is USER (not ADMIN)
        const isUser = roleString === 'USER' || roleString === 'ROLE_USER';
        return isUser;
      });
      
      console.log('Filtered customers count:', customers.length);
      console.log('Filtered customers:', customers);
      setUsers(customers);
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi khi tải danh sách người dùng: ' + (error.response?.data?.message || error.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.id?.toString().includes(term) ||
        user.account?.username?.toLowerCase().includes(term) ||
        user.fullName?.toLowerCase().includes(term) ||
        user.account?.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
      );
    }

    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    setFilteredUsers(filtered);
  };

  const handleViewProfile = async (userId) => {
    try {
      setLoadingProfile(true);
      setShowProfileModal(true);
      
      // Load user info
      let userData = null;
      try {
        // adminAPI.getUserById trả về response.data (User object) hoặc throw error nếu 404
        userData = await adminAPI.getUserById(userId);
        console.log('User data from getUserById:', userData);
      } catch (userError) {
        console.error('Error loading user:', userError);
        if (userError.response?.status === 404) {
          alert('Không tìm thấy người dùng với ID: ' + userId);
        } else {
          alert('Có lỗi khi tải thông tin người dùng: ' + (userError.response?.data?.message || userError.message));
        }
        setShowProfileModal(false);
        return;
      }
      
      if (!userData) {
        alert('Không tìm thấy thông tin người dùng');
        setShowProfileModal(false);
        return;
      }
      
      // Load detailed profile (có thể fail nếu user chưa có profile hoặc không phải Customer)
      let profileData = {};
      try {
        const profileResponse = await api.get(`/profile/${userId}`);
        profileData = profileResponse.data || {};
        console.log('Profile data:', profileData);
      } catch (profileError) {
        console.warn('Could not load detailed profile (user may not have profile yet):', profileError);
        // Nếu không load được profile, vẫn hiển thị thông tin cơ bản từ userData
        profileData = {};
      }
      
      // Merge user data with profile data
      setUserProfile({
        id: userData?.id || userId,
        username: userData?.account?.username || '',
        email: userData?.account?.email || '',
        fullName: userData?.fullName || '',
        phone: profileData?.phone || userData?.phone || '',
        dateOfBirth: profileData?.dateOfBirth || '',
        addressLine: profileData?.addressLine || '',
        commune: profileData?.commune || '',
        district: profileData?.district || '',
        city: profileData?.city || ''
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      console.error('Error details:', error.response?.data);
      alert('Có lỗi khi tải thông tin người dùng: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      setShowProfileModal(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = () => {
    if (!userProfile) return 'Chưa cập nhật';
    
    const hasAddressLine = userProfile.addressLine && userProfile.addressLine.trim() !== '' && userProfile.addressLine !== 'Chưa cập nhật';
    const hasCommune = userProfile.commune && userProfile.commune.trim() !== '' && userProfile.commune !== 'Chưa cập nhật';
    const hasDistrict = userProfile.district && userProfile.district.trim() !== '' && userProfile.district !== 'Chưa cập nhật';
    const hasCity = userProfile.city && userProfile.city.trim() !== '' && userProfile.city !== 'Chưa cập nhật';
    
    if (!hasCity) {
      return 'Chưa cập nhật';
    }
    
    const parts = [];
    if (hasAddressLine) parts.push(userProfile.addressLine);
    if (hasCommune) parts.push(userProfile.commune);
    if (hasDistrict) parts.push(userProfile.district);
    if (hasCity) parts.push(userProfile.city);
    
    return parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Người dùng</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không tìm thấy người dùng nào</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.account?.username || 'N/A'}</td>
                  <td>{user.fullName || 'Chưa cập nhật'}</td>
                  <td>{user.account?.email || 'N/A'}</td>
                  <td>{user.phone || 'Chưa cập nhật'}</td>
                  <td>
                    <button
                      className={styles.viewButton}
                      onClick={() => handleViewProfile(user.id)}
                    >
                      Xem profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Thông tin người dùng</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowProfileModal(false)}
              >
                ✕
              </button>
            </div>

            {loadingProfile ? (
              <div className={styles.modalLoading}>
                <div className={styles.spinner}></div>
                <p>Đang tải thông tin...</p>
              </div>
            ) : userProfile ? (
              <div className={styles.profileInfo}>
                <div className={styles.avatarSection}>
                  <div className={styles.avatar}>
                    {userProfile.fullName?.charAt(0)?.toUpperCase() || userProfile.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <h3 className={styles.profileName}>{userProfile.fullName || userProfile.username}</h3>
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoItem}>
                    <label>ID:</label>
                    <span>{userProfile.id}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Tên đăng nhập:</label>
                    <span>{userProfile.username || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email:</label>
                    <span>{userProfile.email || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Họ và tên:</label>
                    <span>{userProfile.fullName || 'Chưa cập nhật'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại:</label>
                    <span>{userProfile.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Ngày sinh:</label>
                    <span>{formatDate(userProfile.dateOfBirth)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Địa chỉ:</label>
                    <span>{formatAddress()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.modalError}>
                <p>Không thể tải thông tin người dùng</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;

