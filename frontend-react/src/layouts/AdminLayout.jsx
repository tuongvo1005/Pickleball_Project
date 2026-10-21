import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import axiosClient from '../axiosClient';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthContext();
  // Mặc định tự động mở thông báo khi truy cập trang Admin
  const [showNotifications, setShowNotifications] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  // Real-time notifications state & Read items tracking
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleLogout = async () => {
    try { await axiosClient.post('/logout'); } catch (e) { console.error(e); }
    setUser(null);
    setToken(null);
    navigate('/');
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Vừa xong';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (isNaN(diffSec) || diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return `${Math.floor(diffSec / 86400)} ngày trước`;
  };

  const fetchRealNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const [bookingsRes, ordersRes, reviewsRes] = await Promise.all([
        axiosClient.get('/bookings').catch(() => ({ data: { data: [] } })),
        axiosClient.get('/orders').catch(() => ({ data: { data: [] } })),
        axiosClient.get('/reviews').catch(() => ({ data: { data: [] } }))
      ]);

      const bookings = bookingsRes.data?.data || [];
      const orders = ordersRes.data?.data || [];
      const reviews = reviewsRes.data?.data || [];

      // Lấy danh sách ID đã đọc mới nhất từ localStorage
      let currentReadIds = [];
      try {
        const saved = localStorage.getItem('admin_read_notif_ids');
        currentReadIds = saved ? JSON.parse(saved) : [];
      } catch {
        currentReadIds = [];
      }

      const list = [];

      // 1. Thông báo Đơn đặt sân (Bookings)
      bookings.forEach(b => {
        const userName = b.user?.name || 'Khách hàng';
        const courtName = b.court?.name || 'Sân chơi';
        const code = `#BK${String(b.id).padStart(4, '0')}`;
        const isCancelReq = b.status === 'Chờ duyệt hủy';
        const isPendingBooking = b.status === 'pending' || b.payment_status === 'pending';
        const notifId = `booking-${b.id}`;
        const isRead = currentReadIds.includes(notifId);
        const requiresAction = !isRead && (isCancelReq || isPendingBooking);

        list.push({
          id: notifId,
          rawId: b.id,
          searchCode: code,
          type: 'booking',
          isRead,
          requiresAction,
          isCancelReq,
          badgeText: isCancelReq ? '🔴 Yêu cầu hủy' : (isPendingBooking ? '⚡ Cần duyệt ca' : null),
          badgeClass: isCancelReq ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300',
          rawDate: b.created_at || b.booking_date,
          title: isCancelReq
            ? `${userName} vừa gửi yêu cầu HỦY đơn ${code}`
            : `${userName} vừa đặt ${courtName} (${code})`,
          icon: isCancelReq ? 'event_busy' : 'calendar_month',
          iconBg: isCancelReq ? 'bg-red-600 text-white shadow-red-200' : (isPendingBooking ? 'bg-amber-500 text-white' : 'bg-green-100 text-green-700'),
          link: '/admin/bookings'
        });
      });

      // 2. Thông báo Đơn hàng Shop (Orders)
      orders.forEach(o => {
        const userName = o.user?.name || 'Khách hàng';
        const total = Number(o.total_amount || o.total_price || 0).toLocaleString('vi-VN') + 'đ';
        const code = `#ORD${String(o.id).padStart(4, '0')}`;
        const notifId = `order-${o.id}`;
        const isRead = currentReadIds.includes(notifId);
        const requiresAction = !isRead && o.status === 'pending';

        list.push({
          id: notifId,
          rawId: o.id,
          searchCode: code,
          type: 'order',
          isRead,
          requiresAction,
          badgeText: requiresAction ? '📦 Đơn hàng mới' : null,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
          rawDate: o.created_at,
          title: `${userName} vừa đặt đơn hàng shop ${code} (${total})`,
          icon: 'shopping_bag',
          iconBg: requiresAction ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600',
          link: '/admin/orders'
        });
      });

      // 3. Thông báo Đánh giá (Reviews)
      reviews.forEach(r => {
        const userName = r.user?.name || 'Khách hàng';
        const target = r.reviewable_type?.includes('Court') ? 'Sân đấu' : 'Huấn luyện viên';
        const notifId = `review-${r.id}`;
        const isRead = currentReadIds.includes(notifId);

        list.push({
          id: notifId,
          rawId: r.id,
          searchCode: '',
          type: 'review',
          isRead,
          requiresAction: false,
          rawDate: r.created_at,
          title: `${userName} vừa gửi đánh giá ${r.rating}⭐ cho ${target}`,
          icon: 'star',
          iconBg: 'bg-amber-100 text-amber-600',
          link: '/admin/reviews'
        });
      });

      // Sắp xếp: Các đơn CẦN XỬ LÝ (chưa đọc) lên đầu tiên, sau đó theo thời gian mới nhất
      list.sort((a, b) => {
        if (a.requiresAction !== b.requiresAction) {
          return a.requiresAction ? -1 : 1;
        }
        return new Date(b.rawDate || 0) - new Date(a.rawDate || 0);
      });

      const topNotifs = list.slice(0, 10);
      setNotifications(topNotifs);
      
      const unreadItems = topNotifs.filter(n => !n.isRead && (n.requiresAction || n.type === 'booking' || n.type === 'order'));
      setUnreadCount(unreadItems.length);
    } catch (err) {
      console.error("Lỗi lấy thông báo hệ thống:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Cập nhật Real-time tự động định kỳ mỗi 20 giây để giảm tải cho Server
  useEffect(() => {
    fetchRealNotifications();
    const interval = setInterval(() => {
      fetchRealNotifications();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    localStorage.setItem('admin_read_notif_ids', JSON.stringify(updated));
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, requiresAction: false })));
  };

  const handleNotifClick = (n) => {
    const updated = Array.from(new Set([...readNotifIds, n.id]));
    setReadNotifIds(updated);
    localStorage.setItem('admin_read_notif_ids', JSON.stringify(updated));
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true, requiresAction: false } : item));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setShowNotifications(false);
    navigate(n.link, { state: { highlightId: n.rawId, searchCode: n.searchCode } });
  };

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
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white">
            <span className="material-symbols-outlined text-green-500 text-2xl">sports_tennis</span>
            <span>ADMIN PANEL</span>
          </Link>
        </div>

        {/* Danh sách Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-800 bg-black/10">
          <Link to="/" className="flex items-center text-xs font-semibold text-gray-400 hover:text-white transition">
            <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span> Trở về trang web
          </Link>
        </div>
      </aside>

      {/* Main Content Area - Vùng Nội Dung Chính */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header - Thanh Điều Hướng Trên */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-xs">
          
          {/* Vùng trống bên trái header */}
          <div className="flex-1"></div>

          {/* Góc Phải: Thông Báo & Tài Khoản */}
          <div className="flex items-center gap-4">
            
            {/* Real-time Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition relative cursor-pointer ${
                  unreadCount > 0 
                    ? 'bg-red-50 text-red-600 border-red-200 shadow-sm animate-bounce' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                title="Thông báo hệ thống (Realtime)"
              >
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-md animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* DROPDOWN THÔNG BÁO TO HƠN, TỰ ĐỘNG MỞ & IN ĐẬM ĐƠN CẦN XỬ LÝ */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[450px] sm:w-[490px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
                  
                  {/* Header Dropdown */}
                  <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-green-900 text-white font-extrabold text-sm flex justify-between items-center shadow-md">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-400 text-xl animate-pulse">sensors</span>
                      <span>THÔNG BÁO THỰC TẾ (REAL-TIME)</span>
                    </span>
                    <button 
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-green-300 hover:text-white text-xs font-bold cursor-pointer hover:underline border-0 bg-transparent flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      Đánh dấu đã đọc
                    </button>
                  </div>

                  {/* Body Notification List */}
                  <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                    {loadingNotifs && notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-2xl text-green-600">autorenew</span>
                        Đang quét dữ liệu đơn mới thực tế...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        <span className="material-symbols-outlined text-3xl text-gray-300 block mb-1">notifications_off</span>
                        Chưa có thông báo nào từ hệ thống.
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isCancel = n.isCancelReq && !n.isRead;
                        const isUrgent = n.requiresAction && !n.isRead;

                        return (
                          <div 
                            key={n.id} 
                            onClick={() => handleNotifClick(n)}
                            className={`p-4 hover:bg-green-50/70 cursor-pointer flex items-start gap-3.5 transition-all group border-l-4 ${
                              n.isRead 
                                ? 'bg-white border-transparent text-gray-500 opacity-85'
                                : isCancel 
                                  ? 'bg-red-50/70 border-red-500 font-extrabold' 
                                  : isUrgent 
                                    ? 'bg-amber-50/70 border-amber-500 font-extrabold' 
                                    : 'bg-white border-transparent hover:border-green-300'
                            }`}
                          >
                            {/* Icon badge */}
                            <div className={`w-11 h-11 rounded-2xl ${n.isRead ? 'bg-gray-100 text-gray-400' : n.iconBg} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                              <span className="material-symbols-outlined text-xl">{n.icon}</span>
                            </div>

                            {/* Text detail */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {!n.isRead && n.badgeText && (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${n.badgeClass}`}>
                                    {n.badgeText}
                                  </span>
                                )}
                                {n.isRead && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 uppercase">
                                    Đã đọc
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                                  {getRelativeTime(n.rawDate)}
                                </span>
                              </div>

                              {/* Tiêu đề IN ĐẬM KHI CHƯA ĐỌC, BÌNH THƯỜNG KHI ĐÃ ĐỌC */}
                              <p className={`text-sm leading-snug ${!n.isRead && isUrgent ? 'font-extrabold text-gray-900 text-[14px]' : 'font-medium text-gray-700'}`}>
                                {n.title}
                              </p>

                              {!n.isRead && isUrgent && (
                                <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                                  <span>👉 Bấm vào đây để xử lý ngay</span>
                                  <span className="material-symbols-outlined text-[13px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Link */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <Link 
                      to="/admin/bookings" 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-green-600 font-extrabold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Xem tất cả danh sách lịch làm việc</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
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

      </div>

    </div>
  );
};

export default AdminLayout;
