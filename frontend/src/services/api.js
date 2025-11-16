import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm token vào header nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xử lý response và refresh token nếu cần
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  // Đăng ký
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  // Đăng ký admin
  registerAdmin: async (username, email, password) => {
    const response = await api.post('/auth/register-admin', {
      username,
      email,
      password,
    });
    return response.data;
  },

  // Đăng nhập
  login: async (usernameOrEmail, password) => {
    const response = await api.post('/auth/login', {
      usernameOrEmail,
      password,
    });
    return response.data;
  },

  // Đăng nhập admin
  loginAdmin: async (usernameOrEmail, password) => {
    const response = await api.post('/auth/admin/login', {
      usernameOrEmail,
      password,
    });
    return response.data;
  },

  // Quên mật khẩu
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  // Đặt lại mật khẩu
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  // Xác thực email
  verifyEmail: async (token) => {
    const response = await api.get('/auth/verify-email', {
      params: { token },
    });
    return response.data;
  },

  // Đăng xuất
  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Orders
  getAllOrders: async () => {
    const response = await api.get('/orders/admin/all');
    return response.data;
  },
  
  getOrdersByStatus: async (status) => {
    const response = await api.get(`/orders/admin/status/${status}`);
    return response.data;
  },
  
  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },
  
  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/orders/${orderId}/status`, null, {
      params: { newStatus: status }
    });
    return response.data;
  },
  
  getOrderStatuses: async () => {
    const response = await api.get('/orders/statuses');
    return response.data;
  },

  // Products
  getAllProducts: async () => {
    const response = await api.get('/products');
    return response.data;
  },
  
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  
  createProduct: async (product) => {
    const response = await api.post('/products', product);
    return response.data;
  },
  
  updateProduct: async (id, product) => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },
  
  toggleProduct: async (id) => {
    const response = await api.put(`/products/${id}/toggle`);
    return response.data;
  },
  
  uploadProductImages: async (productId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await api.post(`/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getProductImages: async (productId) => {
    const response = await api.get(`/products/${productId}/images`);
    return response.data;
  },
  
  deleteProductImage: async (imageId) => {
    const response = await api.delete(`/products/images/${imageId}`);
    return response.data;
  },

  // Categories
  getAllCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  
  getCategoryById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  
  createCategory: async (category) => {
    const response = await api.post('/categories', category);
    return response.data;
  },
  
  updateCategory: async (id, category) => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },
  
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Users
  getAllUsers: async () => {
    const response = await api.get('/users/all');
    return response.data;
  },
  
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  updateUserStatus: async (id, enabled) => {
    const response = await api.put(`/users/${id}/status`, { enabled });
    return response.data;
  },
  
  searchUsers: async (keyword) => {
    const response = await api.get('/users/search', {
      params: { keyword }
    });
    return response.data;
  },
};

// User API (Public)
export const userAPI = {
  // Products
  getAllProducts: async () => {
    const response = await api.get('/products');
    return response.data;
  },
  
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  
  getProductImages: async (productId) => {
    const response = await api.get(`/products/${productId}/images`);
    return response.data;
  },
  
  getActiveProductsByCategory: async (categoryId) => {
    const response = await api.get(`/products/category/${categoryId}/active`);
    return response.data;
  },
  
  searchProducts: async (keyword) => {
    const response = await api.get('/products/search', {
      params: { keyword }
    });
    return response.data;
  },
  
  getTopSelling: async () => {
    const response = await api.get('/products/top-selling');
    return response.data;
  },
  
  getNewestProducts: async () => {
    const response = await api.get('/products/newest');
    return response.data;
  },
  
  getLast7DaysProducts: async () => {
    const response = await api.get('/products/last-7-days');
    return response.data;
  },
  
  // Categories
  getAllCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  
  getCategoryById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  
  // Cart
  getCart: async (userId) => {
    const response = await api.get(`/cart/user/${userId}`);
    return response.data;
  },
  
  addToCart: async (userId, productId, quantity = 1) => {
    const response = await api.post('/cart/add', null, {
      params: { userId, productId, quantity }
    });
    return response.data;
  },
  
  increaseCartItem: async (userId, itemId) => {
    const response = await api.put(`/cart/increase/${userId}/${itemId}`);
    return response.data;
  },
  
  decreaseCartItem: async (userId, itemId) => {
    const response = await api.put(`/cart/decrease/${userId}/${itemId}`);
    return response.data;
  },
  
  deleteCartItem: async (userId, itemId) => {
    const response = await api.delete(`/cart/remove/${userId}/${itemId}`);
    return response.data;
  },
  
  // Reviews
  getProductReviews: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}`);
    return response.data;
  },
  
  getProductRating: async (productId) => {
    const response = await api.get(`/reviews/rating/${productId}`);
    return response.data;
  },
  
  createReview: async (productId, customerId, rating, content, images = []) => {
    const response = await api.post('/reviews', images, {
      params: { productId, customerId, rating, content }
    });
    return response.data;
  },
};

export default api;

