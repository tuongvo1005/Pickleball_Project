import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axiosClient from '../axiosClient';

const Navbar = () => {
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, setUser, setToken } = useAuthContext();
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await axiosClient.post('/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setToken(null);
    setCartCount(0);
    setShowUserMenu(false);
    toast.success('Đăng xuất thành công!');
    navigate('/');
  };

  // Cập nhật số lượng giỏ hàng từ localStorage
  const updateCartCount = () => {
    if (!user) { setCartCount(0); return; }
    const cartKey = `cart_${user.id}`;
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    setCartCount(cart.reduce((t, item) => t + item.quantity, 0));
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, [user]);

  // Menu items theo role
  const getRoleMenuItems = () => {
    if (!user) return [];
    if (user.role === 'admin') return [
      { icon: 'shield_person', label: 'Trang Admin', to: '/admin' },
      { icon: 'manage_accounts', label: 'Hồ sơ Admin', to: '/admin/profile' },
      { icon: 'person', label: 'Thông tin cá nhân', to: '/profile' },
    ];
    return [
      { icon: 'receipt_long', label: 'Đơn hàng của tôi', to: '/my-orders' },
      { icon: 'shopping_cart', label: 'Giỏ hàng', to: '/cart' },
      { icon: 'person', label: 'Thông tin cá nhân', to: '/profile' },
    ];
  };

  const roleLabel = { admin: 'Quản trị viên', coach: 'Huấn luyện viên', user: 'Thành viên' };
  const roleColor = { admin: 'bg-red-100 text-red-600', coach: 'bg-blue-100 text-blue-600', user: 'bg-green-100 text-green-600' };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">sports_tennis</span>
              PickleBall Pro
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex space-x-8 items-center">
            <NavLink 
              to="/" 
              end 
              className={({ isActive }) => `hover:text-green-600 transition-colors py-1 ${isActive ? 'text-green-600 font-bold border-b-2 border-green-600' : 'text-gray-700 font-medium'}`}
            >
              Trang chủ
            </NavLink>
            <NavLink 
              to="/courts" 
              className={({ isActive }) => `hover:text-green-600 transition-colors py-1 ${isActive ? 'text-green-600 font-bold border-b-2 border-green-600' : 'text-gray-700 font-medium'}`}
            >
              Tìm sân
            </NavLink>
            <NavLink 
              to="/shop" 
              className={({ isActive }) => `hover:text-green-600 transition-colors py-1 ${isActive ? 'text-green-600 font-bold border-b-2 border-green-600' : 'text-gray-700 font-medium'}`}
            >
              Dụng cụ
            </NavLink>
            <NavLink 
              to="/tournaments" 
              className={({ isActive }) => `hover:text-green-600 transition-colors py-1 ${isActive ? 'text-green-600 font-bold border-b-2 border-green-600' : 'text-gray-700 font-medium'}`}
            >
              Giải đấu
            </NavLink>
            <NavLink 
              to="/coaches" 
              className={({ isActive }) => `hover:text-green-600 transition-colors py-1 ${isActive ? 'text-green-600 font-bold border-b-2 border-green-600' : 'text-gray-700 font-medium'}`}
            >
              Huấn luyện viên
            </NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Giỏ hàng */}
            <button
              onClick={() => {
                if (!user) { toast.warning('Vui lòng đăng nhập để xem giỏ hàng!'); navigate('/login'); }
                else navigate('/cart');
              }}
              className="relative text-gray-600 hover:text-blue-600 transition p-2 cursor-pointer bg-transparent border-0 outline-none"
            >
              <span className="material-symbols-outlined text-[28px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Đặt ngay */}
            <button
              onClick={() => {
                if (!user) { toast.warning('Vui lòng đăng nhập để đặt sân!'); navigate('/login'); }
                else navigate('/courts');
              }}
              className="bg-green-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-green-700 transition shadow-sm hidden sm:block cursor-pointer border-0"
            >
              Đặt ngay
            </button>

            {/* User dropdown hoặc Đăng nhập */}
            {user ? (
              <div className="relative ml-1" ref={menuRef}>
                {/* Avatar trigger button */}
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm overflow-hidden ${roleColor[user.role] || 'bg-green-100 text-green-700'}`}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
 
                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* Header thông tin */}
                    <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shadow overflow-hidden ${roleColor[user.role] || 'bg-green-100 text-green-700'}`}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor[user.role] || 'bg-green-100 text-green-600'}`}>
                            {roleLabel[user.role] || 'Thành viên'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Links theo role */}
                    <div className="py-1.5">
                      {getRoleMenuItems().map((item, i) => (
                        <Link
                          key={i}
                          to={item.to}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-gray-400">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* Đăng xuất */}
                    <div className="border-t border-gray-100 py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1 text-green-600 border-2 border-green-600 px-4 py-1.5 rounded-full font-semibold hover:bg-green-50 transition">
                <span className="material-symbols-outlined text-[18px]">login</span>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
