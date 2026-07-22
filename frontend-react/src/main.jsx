import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import axios from 'axios';

// Cấu hình interceptor toàn cục cho thư viện axios để tự động chuyển đổi URL khi deploy và đính kèm token
axios.interceptors.request.use((config) => {
  if (config.url) {
    // Tự động chuyển đổi http://127.0.0.1:8000 hoặc http://localhost:8000 sang domain hiện tại nếu không ở local
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      config.url = config.url.replace(/https?:\/\/(127\.0\.0\.1|localhost):8000/g, window.location.origin);
    }
  }
  
  // Tự động đính kèm token cho mọi request axios (kể cả gọi trực tiếp qua thư viện axios thông thường)
  const token = localStorage.getItem('ACCESS_TOKEN');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
