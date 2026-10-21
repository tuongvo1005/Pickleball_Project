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

  // Trạng thái thông báo HỦY SÂN / HỦY ĐƠN HÀNG nổi bật cho User
  const [cancelModalData, setCancelModalData] = useState(null);

  const checkUserCancellations = async () => {
    if (!user || user.role === 'admin') return;
    
    try {
      let dismissedIds = [];
      try {
        dismissedIds = JSON.parse(localStorage.getItem(`dismissed_cancel_notifs_${user.id}`) || '[]');
      } catch (e) {
        dismissedIds = [];
      }

      // Fetch user bookings & orders
      const [bookingsRes, ordersRes] = await Promise.all([
        axiosClient.get('/bookings').catch(() => ({ data: { data: [] } })),
        axiosClient.get('/orders').catch(() => ({ data: { data: [] } }))
      ]);

      const myBookings = (bookingsRes.data?.data || []).filter(b => 
        b.user_id?.toString() === user.id?.toString() && b.status === 'cancelled'
      );

      const myOrders = (ordersRes.data?.data || []).filter(o => 
        o.user_id?.toString() === user.id?.toString() && o.status === 'cancelled'
      );

      // Tìm đơn đầu tiên bị hủy chưa bấm "Đã hiểu"
      const unacknowledgedBooking = myBookings.find(b => !dismissedIds.includes(`booking-${b.id}`));
      if (unacknowledgedBooking) {
        setCancelModalData({
          type: 'booking',
          id: unacknowledgedBooking.id,
          notifKey: `booking-${unacknowledgedBooking.id}`,
          code: `#BK${String(unacknowledgedBooking.id).padStart(4, '0')}`,
          title: 'Thông báo HỦY LỊCH ĐẶT SÂN từ Ban Quản Trị CLB',
          detailName: unacknowledgedBooking.court?.name || 'Lịch đặt sân Pickleball',
          dateStr: `${unacknowledgedBooking.start_time || ''} - ${unacknowledgedBooking.end_time || ''} (${unacknowledgedBooking.booking_date || ''})`,
          note: unacknowledgedBooking.notes || 'Lịch đặt sân của bạn đã được hủy theo yêu cầu hoặc do sự cố bảo trì sân.',
          link: '/profile'
        });
        return;
      }

      const unacknowledgedOrder = myOrders.find(o => !dismissedIds.includes(`order-${o.id}`));
      if (unacknowledgedOrder) {
        setCancelModalData({
          type: 'order',
          id: unacknowledgedOrder.id,
          notifKey: `order-${unacknowledgedOrder.id}`,
          code: `#ORD${String(unacknowledgedOrder.id).padStart(4, '0')}`,
          title: 'Thông báo HỦY ĐƠN HÀNG SHOP từ Ban Quản Trị CLB',
          detailName: `Đơn hàng shop ${Number(unacknowledgedOrder.total_amount || 0).toLocaleString('vi-VN')}đ`,
          dateStr: unacknowledgedOrder.created_at ? new Date(unacknowledgedOrder.created_at).toLocaleString('vi-VN') : 'Vừa qua',
          note: unacknowledgedOrder.shipping_details?.note || 'Đơn hàng của bạn đã bị hủy. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.',
          link: '/my-orders'
        });
        return;
      }
    } catch (err) {
      console.error("Lỗi kiểm tra thông báo hủy đơn:", err);
    }
  };

  useEffect(() => {
    checkUserCancellations();
    const interval = setInterval(checkUserCancellations, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDismissCancelModal = () => {
    if (!cancelModalData || !user) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`dismissed_cancel_notifs_${user.id}`) || '[]');
      const updated = Array.from(new Set([...saved, cancelModalData.notifKey]));
      localStorage.setItem(`dismissed_cancel_notifs_${user.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setCancelModalData(null);
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

      {/* ===== POPUP THÔNG BÁO HỦY SÂN / HỦY ĐƠN HÀNG TO NỔI BẬT DÀNH CHO USER ===== */}
      {cancelModalData && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-red-200 flex flex-col">
            
            {/* Header Modal - Gradient Đỏ Nổi Bật */}
            <div className="p-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-3xl animate-bounce text-white">event_busy</span>
              </div>
              <div>
                <span className="bg-red-950/70 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-red-400/40">
                  Thông báo từ Ban Quản Trị CLB
                </span>
                <h3 className="text-base sm:text-lg font-extrabold mt-1 text-white leading-snug">
                  {cancelModalData.title}
                </h3>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 text-gray-700 text-sm">
              <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-700 font-bold uppercase tracking-wider">Mã chứng từ:</span>
                  <span className="font-black text-red-900 text-base">{cancelModalData.code}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">Đối tượng:</span>
                  <span className="font-bold text-gray-900">{cancelModalData.detailName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">Thời gian:</span>
                  <span className="font-medium text-gray-800">{cancelModalData.dateStr}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-red-500">info</span>
                  Nội dung / Lý do thông báo từ Admin:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-semibold text-gray-800 italic leading-relaxed">
                  "{cancelModalData.note}"
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">support_agent</span>
                <span>Nếu bạn cần hoàn tiền hoặc hỗ trợ xếp ca chơi mới, vui lòng bấm vào nút Chat phía góc phải bên dưới để liên hệ Quản trị viên.</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  const link = cancelModalData.link;
                  handleDismissCancelModal();
                  navigate(link);
                }}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-bold py-3.5 px-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
              >
                <span className="material-symbols-outlined text-[18px] text-blue-600">visibility</span>
                Xem chi tiết đơn của tôi
              </button>

              <button
                type="button"
                onClick={handleDismissCancelModal}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer border-0 text-xs"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                Đã hiểu &amp; Đóng thông báo
              </button>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
