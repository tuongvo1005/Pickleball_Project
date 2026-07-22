import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../axiosClient';
import { useAuthContext } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthContext();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [role, setRole] = useState('user'); // user, coach, admin
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email) {
      setError('Vui lòng nhập email trước khi nhận mã!');
      return;
    }
    setSendingCode(true);
    setError(null);
    setSuccess(null);
    try {
      const endpoint = mode === 'forgot' ? '/forgot-password/send-otp' : '/send-code';
      const response = await axiosClient.post(endpoint, { email });
      if (response.data.success) {
        setCodeSent(true);
        const debugMsg = response.data.debug_code 
          ? ` (Mã kiểm thử nhanh: ${response.data.debug_code})` 
          : '';
        setSuccess(response.data.message + debugMsg);
        startCountdown();
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Không thể gửi mã xác thực, vui lòng thử lại.');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        // GỌI API ĐĂNG NHẬP
        const response = await axiosClient.post('/login', {
          email,
          password
        });
        
        const userData = response.data.data;
        const token = response.data.access_token;

        // Lưu thông tin vào AuthContext
        setToken(token);
        setUser(userData);
        
        setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        
        setTimeout(() => {
          if (userData.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);

      } else if (mode === 'register') {
        if (password !== passwordConfirmation) {
          setError('Mật khẩu xác nhận không khớp!');
          setLoading(false);
          return;
        }

        if (!verificationCode) {
          setError('Vui lòng điền mã xác thực gửi qua email!');
          setLoading(false);
          return;
        }

        const response = await axiosClient.post('/register', {
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
          role: role,
          verification_code: verificationCode
        });
        
        const userData = response.data.data;
        const token = response.data.access_token;

        setToken(token);
        setUser(userData);
        
        setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          if (userData.role === 'admin') navigate('/admin');
          else navigate('/');
        }, 1000);

      } else if (mode === 'forgot') {
        if (password !== passwordConfirmation) {
          setError('Mật khẩu xác nhận không khớp!');
          setLoading(false);
          return;
        }

        if (!verificationCode) {
          setError('Vui lòng điền mã OTP gửi qua email!');
          setLoading(false);
          return;
        }

        const response = await axiosClient.post('/forgot-password/reset', {
          email,
          verification_code: verificationCode,
          password,
          password_confirmation: passwordConfirmation
        });

        if (response.data.success) {
          setSuccess(response.data.message);
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setPasswordConfirmation('');
            setVerificationCode('');
            setError(null);
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Có lỗi xảy ra, vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setVerificationCode('');
    setCodeSent(false);
    setPassword('');
    setPasswordConfirmation('');
  };

  // Nút Quick Login dùng để test nhanh (Dành cho Giảng viên chấm bài)
  const quickLogin = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setTimeout(() => {
       document.getElementById('submitBtn').click();
    }, 100);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-green-900/60 backdrop-blur-sm z-0"></div>
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 relative z-10 my-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-green-600">
              {mode === 'login' ? 'lock_open' : mode === 'register' ? 'person_add' : 'mark_email_unread'}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {mode === 'login' && 'Chào mừng trở lại'}
            {mode === 'register' && 'Tạo tài khoản'}
            {mode === 'forgot' && 'Khôi phục mật khẩu'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'login' && 'Đăng nhập để vào hệ thống'}
            {mode === 'register' && 'Chọn vai trò và đăng ký nhanh chóng'}
            {mode === 'forgot' && 'Nhập email để nhận mã OTP khôi phục mật khẩu'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-green-500">check_circle</span>
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Ô nhập OTP cho Đăng ký hoặc Quên mật khẩu */}
          {(mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'forgot' ? 'Mã OTP qua Email' : 'Mã xác thực Email'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">shield</span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors tracking-[0.2em] font-mono text-center font-bold"
                    placeholder="------"
                  />
                </div>
                <button
                  type="button"
                  disabled={sendingCode || countdown > 0}
                  onClick={handleSendCode}
                  className="h-10 px-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px] flex items-center justify-center cursor-pointer"
                >
                  {sendingCode ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : countdown > 0 ? (
                    `Gửi lại (${countdown}s)`
                  ) : (
                    'Nhận mã'
                  )}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                {mode === 'forgot' ? 'Mật khẩu mới' : 'Mật khẩu'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {(mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'forgot' ? 'Xác nhận mật khẩu mới' : 'Xác nhận mật khẩu'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">lock_reset</span>
                <input
                  type="password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            id="submitBtn"
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">autorenew</span>
            ) : mode === 'login' ? (
              'Đăng Nhập'
            ) : mode === 'register' ? (
              'Đăng Ký'
            ) : (
              'Đặt Lại Mật Khẩu'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' && (
            <>
              <span className="text-gray-600">Chưa có tài khoản?</span>
              <button 
                onClick={() => switchMode('register')}
                className="ml-2 font-bold text-green-600 hover:text-green-500 hover:underline focus:outline-none"
              >
                Đăng ký ngay
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              <span className="text-gray-600">Đã có tài khoản?</span>
              <button 
                onClick={() => switchMode('login')}
                className="ml-2 font-bold text-green-600 hover:text-green-500 hover:underline focus:outline-none"
              >
                Đăng nhập ngay
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <span className="text-gray-600">Đã nhớ mật khẩu?</span>
              <button 
                onClick={() => switchMode('login')}
                className="ml-2 font-bold text-green-600 hover:text-green-500 hover:underline focus:outline-none"
              >
                Quay lại Đăng nhập
              </button>
            </>
          )}
        </div>

        {/* Khối Test Nhanh (Dành cho Giảng Viên) */}
        {mode === 'login' && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-bold">Nút test nhanh (Dành cho Giảng Viên)</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => quickLogin('admin@pickleball.com', 'password')}
                className="bg-purple-100 text-purple-700 text-xs font-bold py-2 rounded hover:bg-purple-200 transition"
              >
                ADMIN
              </button>
              <button 
                type="button"
                onClick={() => quickLogin('user@pickleball.com', 'password')}
                className="bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded hover:bg-gray-200 transition"
              >
                USER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
