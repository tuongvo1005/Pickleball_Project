import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const axiosClient = axios.create({
  baseURL: isLocal ? 'http://127.0.0.1:8000/api' : `${window.location.origin}/api`,
});

// Request Interceptor: Gắn token vào header
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ACCESS_TOKEN');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Xử lý lỗi 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    try {
      const { response } = error;
      // Nếu token hết hạn hoặc không hợp lệ, xóa sạch dữ liệu đăng nhập
      if (response && response.status === 401) {
        localStorage.removeItem('ACCESS_TOKEN');
        localStorage.removeItem('user_info');
      }
    } catch (e) {
      console.error(e);
    }
    throw error;
  }
);

export default axiosClient;
