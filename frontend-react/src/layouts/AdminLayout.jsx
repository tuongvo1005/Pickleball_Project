import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import axiosClient from '../axiosClient';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    try { await axiosClient.post('/logout'); } catch (e) { console.error(e); }
    setUser(null);
    setToken(null);
    navigate('/');
  };

  // Đóng dropdown khi click ra ngoài
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { path: '/admin', icon: 'dashboard', label: 'Tổng quan' },
    { path: '/admin/courts', icon: 'sports_tennis', label: 'Quản lý sân' },
    { path: '/admin/products', icon: 'inventory_2', label: 'Cửa hàng' },
    { path: '/admin/orders', icon: 'receipt_long', label: 'Đơn hàng' },
    { path: '/admin/bookings', icon: 'event_note', label: 'Đơn đặt sân' },
    { path: '/admin/tournaments', icon: 'emoji_events', label: 'Giải đấu' },
    { path: '/admin/users', icon: 'group', label: 'Người dùng' },
    { path: '/admin/chats', icon: 'chat', label: 'Tin nhắn hỗ trợ' },
    { path: '/admin/reviews', icon: 'rate_review', label: 'Đánh giá' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* Sidebar - Cột Menu Trái */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-black/20">
          <span className="material-symbols-outlined text-green-500 mr-2">shield_person</span>
          <span className="text-xl font-bold tracking-wider">ADMIN PANEL</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-3">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Trở về trang web */}
        <div className="p-4 border-t border-gray-800">
          <Link
            to="/"
            className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <span className="material-symbols-outlined mr-3">arrow_back</span>
            Trở về trang web
          </Link>
        </div>
      </aside>

      {/* Main Content - Cột Nội Dung Phải */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm relative z-30">
          <form 
            onSubmit={(e) => { e.preventDefault(); }} 
            className="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all"
          >
            <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
            <input type="text" placeholder="Tìm kiếm nhanh... (Nhấn Enter)" className="bg-transparent border-none outline-none text-sm ml-2 w-64 text-gray-700" />
          </form>
          
          <div className="flex items-center gap-6">
            
            {/* Thông báo */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-gray-500 hover:text-green-600 transition-colors mt-1">
                <span className="material-symbols-outlined text-2xl">notifications</span>
                <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full border border-white animate-pulse"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex justify-between">
                    Thông báo mới <span className="text-green-600 text-xs font-normal cursor-pointer hover:underline">Đọc tất cả</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="p-3 hover:bg-gray-50 cursor-pointer flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">shopping_bag</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800"><span className="font-bold">Trần B</span> vừa đặt 1 đơn hàng mới.</p>
                        <p className="text-xs text-gray-400 mt-1">5 phút trước</p>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-gray-50 cursor-pointer flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800"><span className="font-bold">Nguyễn A</span> vừa đặt Sân VIP 1.</p>
                        <p className="text-xs text-gray-400 mt-1">1 giờ trước</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 pl-6 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src="https://ui-avatars.com/api/?name=Admin&background=16a34a&color=fff" alt="Admin" className="w-9 h-9 rounded-full ring-2 ring-green-100" />
                <div>
                  <span className="block text-sm font-bold text-gray-800 leading-none">Quản trị viên</span>
                  <span className="block text-xs text-green-600 font-medium mt-1">Super Admin</span>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-sm ml-1">{showProfile ? 'expand_less' : 'expand_more'}</span>
              </div>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="py-1">
                    <Link to="/admin/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600">
                      <span className="material-symbols-outlined text-lg mr-2">manage_accounts</span> Tài khoản
                    </Link>
                    <Link to="/admin/settings" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600">
                      <span className="material-symbols-outlined text-lg mr-2">settings</span> Cài đặt hệ thống
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium border-0 bg-transparent text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg mr-2">logout</span> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Nội dung thay đổi ở đây (Outlet) */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default AdminLayout;
