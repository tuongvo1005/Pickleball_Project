import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../axiosClient';

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueTab, setRevenueTab] = useState('bookings'); // 'bookings' or 'orders'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Tải bookings
        const bookingsRes = await axiosClient.get('/bookings');
        if (bookingsRes.data && bookingsRes.data.data) {
          setBookings(bookingsRes.data.data);
        }
      } catch (err) {
        console.error("Lỗi lấy bookings:", err);
      }

      try {
        // 2. Tải orders
        const ordersRes = await axiosClient.get('/orders');
        if (ordersRes.data && ordersRes.data.data) {
          setOrders(ordersRes.data.data);
        }
      } catch (err) {
        console.error("Lỗi lấy orders:", err);
      }

      try {
        // 3. Tải products
        const productsRes = await axiosClient.get('/products');
        if (productsRes.data && productsRes.data.data) {
          setProducts(productsRes.data.data);
        }
      } catch (err) {
        console.error("Lỗi lấy products:", err);
      }

      try {
        // 4. Tải users
        const usersRes = await axiosClient.get('/admin/users');
        if (usersRes.data && usersRes.data.data) {
          setUsersCount(usersRes.data.data.length);
        } else {
          setUsersCount(12); // fallback
        }
      } catch (err) {
        console.error("Lỗi lấy users:", err);
        setUsersCount(12); // fallback
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getProductName = (productId) => {
    const prod = products.find(p => p.id === productId);
    return prod ? prod.name : `Sản phẩm #${productId}`;
  };

  const getOrderItemsNames = (order) => {
    let items = [];
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items) || items.length === 0) return 'Đơn hàng không có sản phẩm';
    return items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      return prod ? `${prod.name} (x${item.quantity})` : `Sản phẩm #${item.product_id} (x${item.quantity})`;
    }).join(', ');
  };

  const getOrderSummary = (order) => {
    let items = [];
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items) || items.length === 0) return 'Đơn hàng sản phẩm thể thao';
    const firstItem = items[0];
    const prodName = firstItem ? getProductName(firstItem.product_id) : 'Sản phẩm thể thao';
    const extraItemsCount = items.length - 1;
    return extraItemsCount > 0 ? `${prodName} (+${extraItemsCount} sản phẩm)` : prodName;
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Vừa xong';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  // State Lọc thời gian linh hoạt
  const [filterType, setFilterType] = useState('all'); // 'all', 'day', 'month', 'year'
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const getDateParts = (dateStr) => {
    if (!dateStr) return { day: null, month: null, year: null };
    
    // Nếu là chuỗi ngày YYYY-MM-DD thuần túy (như booking_date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return {
        day: dateStr,
        month: `${parts[0]}-${parts[1]}`,
        year: parts[0]
      };
    }

    // Nếu dateStr là timestamp ISO hoặcdatetime từ DB (như created_at / updated_at)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDay = `${year}-${month}-${day}`;
      return {
        day: formattedDay,
        month: `${year}-${month}`,
        year: `${year}`
      };
    }

    const datePart = String(dateStr).split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return {
        day: datePart,
        month: `${parts[0]}-${parts[1]}`,
        year: parts[0]
      };
    }
    return { day: null, month: null, year: null };
  };

  const availableDays = Array.from(new Set([
    ...bookings.map(b => getDateParts(b.booking_date || b.created_at).day),
    ...orders.map(o => getDateParts(o.created_at).day)
  ])).filter(Boolean).sort().reverse();

  const availableMonths = Array.from(new Set([
    ...bookings.map(b => getDateParts(b.booking_date || b.created_at).month),
    ...orders.map(o => getDateParts(o.created_at).month)
  ])).filter(Boolean).sort().reverse();

  const availableYears = Array.from(new Set([
    ...bookings.map(b => getDateParts(b.booking_date || b.created_at).year),
    ...orders.map(o => getDateParts(o.created_at).year)
  ])).filter(Boolean).sort().reverse();

  // Khởi tạo giá trị mặc định khi có dữ liệu
  useEffect(() => {
    if (availableDays.length > 0 && !selectedDay) setSelectedDay(availableDays[0]);
    if (availableMonths.length > 0 && !selectedMonth) setSelectedMonth(availableMonths[0]);
    if (availableYears.length > 0 && !selectedYear) setSelectedYear(availableYears[0]);
  }, [bookings, orders]);

  const matchesFilter = (dateStr) => {
    if (filterType === 'all') return true;
    const { day, month, year } = getDateParts(dateStr);
    if (filterType === 'day') return day === selectedDay;
    if (filterType === 'month') return month === selectedMonth;
    if (filterType === 'year') return year === selectedYear;
    return true;
  };

  // Tính doanh thu chuẩn cho từng đơn đặt sân:
  // - Khi đơn ở trạng thái "Đã duyệt" (Đã cọc): Chỉ tính 50% số tiền cọc
  // - Khi Admin nhấn nút DẤU TICK (Xác nhận hoàn thành ca chơi): Mới cộng đủ 100% tổng tiền
  const getBookingRevenue = (b) => {
    if (!b) return 0;
    if (b.status === 'completed') {
      return Number(b.total_price || 0);
    }
    if (b.status === 'confirmed' || b.payment_status === 'paid' || b.status === 'approved') {
      return Number(b.total_price || 0) * 0.5;
    }
    return 0;
  };

  const isRevenueBooking = (b) => 
    getBookingRevenue(b) > 0 && 
    matchesFilter(b.booking_date || b.created_at);

  const isRevenueOrder = (o) => 
    o.status === 'delivered' && 
    matchesFilter(o.created_at);

  const filteredBookings = bookings.filter(b => matchesFilter(b.booking_date || b.created_at));
  const filteredOrders = orders.filter(o => matchesFilter(o.created_at));

  const revenueBookings = bookings.filter(isRevenueBooking);
  const revenueOrders = orders.filter(isRevenueOrder);

  const bookingsRevenue = filteredBookings.reduce((sum, b) => sum + getBookingRevenue(b), 0);
  const ordersRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalRevenue = bookingsRevenue + ordersRevenue;

  // Tính số lượng cho 3 ô bên cạnh Doanh thu
  const totalBookingsCount = filteredBookings.length;
  const totalOrdersCount = filteredOrders.length;
  
  const uniqueUsersInFilter = new Set([
    ...filteredBookings.map(b => b.user_id),
    ...filteredOrders.map(o => o.user_id)
  ].filter(Boolean));
  const activeCustomersCount = filterType === 'all' ? usersCount : uniqueUsersInFilter.size;

  // Thống kê 4 ô cập nhật đồng bộ theo bộ lọc
  const stats = [
    { 
      title: 'Tổng Doanh Thu', 
      value: `${totalRevenue.toLocaleString('vi-VN')}đ`, 
      icon: 'payments', 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      subtext: 'Bấm để xem chi tiết'
    },
    { 
      title: 'Lượt Đặt Sân', 
      value: totalBookingsCount.toString(), 
      icon: 'calendar_month', 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      subtext: filterType === 'all' ? 'Tất cả thời gian' : 'Theo lọc thời gian'
    },
    { 
      title: 'Đơn Hàng Shop', 
      value: totalOrdersCount.toString(), 
      icon: 'shopping_bag', 
      color: 'text-orange-600', 
      bg: 'bg-orange-100',
      subtext: filterType === 'all' ? 'Tất cả thời gian' : 'Theo lọc thời gian'
    },
    { 
      title: 'Khách Hàng', 
      value: activeCustomersCount.toString(), 
      icon: 'group', 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      subtext: filterType === 'all' ? 'Tổng tài khoản' : 'Khách hàng giao dịch'
    },
  ];

  // Danh sách hiển thị bảng gần đây (Sắp xếp từ MỚI NHẤT -> CŨ NHẤT)
  const recentBookings = [...filteredBookings]
    .sort((a, b) => new Date(b.created_at || b.booking_date || 0).getTime() - new Date(a.created_at || a.booking_date || 0).getTime() || Number(b.id) - Number(a.id))
    .slice(0, 5);

  const recentOrders = [...filteredOrders]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime() || Number(b.id) - Number(a.id))
    .slice(0, 5);

  const getStatusBadge = (paymentStatus, bookingStatus) => {
    if (bookingStatus === 'completed') {
      return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">Đã hoàn thành</span>;
    }
    if (bookingStatus === 'cancelled') {
      return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã hủy</span>;
    }
    if (bookingStatus === 'confirmed' || paymentStatus === 'paid') {
      return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã cọc</span>;
    }
    if (paymentStatus === 'refunded') {
      return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">Hoàn trả</span>;
    }
    return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">Chờ duyệt</span>;
  };

  const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-xs text-gray-500 mt-0.5">Báo cáo doanh thu & chỉ số vận hành sân và cửa hàng</p>
        </div>
        
        {/* Bộ lọc thời gian linh hoạt: Tất cả / Theo ngày / Theo tháng / Theo năm */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1 pl-2 text-green-600 font-bold text-xs">
            <span className="material-symbols-outlined text-lg">filter_alt</span>
            <span>LỌC:</span>
          </div>

          {/* Chọn chế độ lọc */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-100 text-xs font-bold text-gray-800 px-3 py-1.5 rounded-xl outline-none border-none cursor-pointer hover:bg-gray-200 transition"
          >
            <option value="all">📅 Tất cả thời gian</option>
            <option value="day">📆 Theo Ngày</option>
            <option value="month">🗓️ Theo Tháng</option>
            <option value="year">📊 Theo Năm</option>
          </select>

          {/* Ô chọn cụ thể tùy chế độ */}
          {filterType === 'day' && (
            <input 
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-green-50 text-xs font-bold text-green-800 px-3 py-1.5 rounded-xl border border-green-200 outline-none cursor-pointer"
            />
          )}

          {filterType === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-green-50 text-xs font-bold text-green-800 px-3 py-1.5 rounded-xl border border-green-200 outline-none cursor-pointer"
            >
              {availableMonths.map(ym => {
                const [y, m] = ym.split('-');
                return (
                  <option key={ym} value={ym}>
                    Tháng {Number(m)}/{y}
                  </option>
                );
              })}
            </select>
          )}

          {filterType === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-green-50 text-xs font-bold text-green-800 px-3 py-1.5 rounded-xl border border-green-200 outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Năm {yr}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Thống kê 4 ô đồng bộ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const isRevenue = idx === 0;
          return (
            <div 
              key={idx} 
              onClick={isRevenue ? () => setShowRevenueModal(true) : undefined}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center transition-all ${
                isRevenue 
                  ? 'cursor-pointer hover:shadow-md hover:border-green-300 hover:bg-green-50/10 active:scale-[0.98]' 
                  : ''
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} mr-4 shrink-0 shadow-inner`}>
                <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  {stat.title}
                  {isRevenue && (
                    <span className="material-symbols-outlined text-[14px] text-green-500 animate-pulse">visibility</span>
                  )}
                </p>
                <h3 className="text-2xl font-black text-gray-900 truncate">{stat.value}</h3>
                <span className="text-[11px] text-gray-400 font-medium block mt-0.5">{stat.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CHI TIẾT DOANH THU */}
      {showRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">payments</span>
                <h3 className="text-lg font-bold">Chi Tiết Doanh Thu</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl border border-white/30 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">filter_alt</span>
                  <span>
                    {filterType === 'all' && 'Tất cả thời gian'}
                    {filterType === 'day' && `Ngày ${formatDateVN(selectedDay)}`}
                    {filterType === 'month' && selectedMonth && `Tháng ${Number(selectedMonth.split('-')[1])}/${selectedMonth.split('-')[0]}`}
                    {filterType === 'year' && `Năm ${selectedYear}`}
                  </span>
                </div>

                <button 
                  onClick={() => setShowRevenueModal(false)} 
                  className="text-white/80 hover:text-white transition bg-transparent border-0 cursor-pointer flex items-center p-1"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-150 bg-gray-50/50">
              <button 
                type="button"
                onClick={() => setRevenueTab('bookings')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  revenueTab === 'bookings' 
                    ? 'border-green-600 text-green-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Lịch Đặt Sân ({bookings.filter(isRevenueBooking).length}) - {bookingsRevenue.toLocaleString('vi-VN')}đ
              </button>
              <button 
                type="button"
                onClick={() => setRevenueTab('orders')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                  revenueTab === 'orders' 
                    ? 'border-green-600 text-green-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Đơn Hàng Shop ({orders.filter(isRevenueOrder).length}) - {ordersRevenue.toLocaleString('vi-VN')}đ
              </button>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {revenueTab === 'bookings' ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-gray-500 sticky top-0 bg-white z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50 rounded-tl-lg">Mã Đặt</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Khách Hàng</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Sân / HLV</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Thời Gian</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50 text-right rounded-tr-lg">Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings
                      .filter(isRevenueBooking)
                      .map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-bold text-gray-900">#PB-{booking.id}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">{booking.user?.name || 'Khách vãng lai'}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {booking.court?.name || (booking.coach?.name ? `HLV: ${booking.coach.name}` : 'Sân mẫu')}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <div className="font-semibold">{booking.booking_date}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{booking.start_time} - {booking.end_time}</div>
                            {booking.status === 'completed' ? (
                              <span className="inline-block mt-0.5 text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                                Đã hoàn thành (100%)
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                Đã cọc 50%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-green-600 text-right">
                            {getBookingRevenue(booking).toLocaleString('vi-VN')}đ
                            {booking.status !== 'completed' && (
                              <div className="text-[10px] text-gray-400 font-normal">
                                (Tổng: {Number(booking.total_price).toLocaleString('vi-VN')}đ)
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {bookings.filter(isRevenueBooking).length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400 font-medium">
                          Chưa có doanh thu đặt sân nào được ghi nhận trong thời gian chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-gray-500 sticky top-0 bg-white z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50 rounded-tl-lg">Mã Đơn</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Khách Hàng</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Sản Phẩm</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50">Trạng Thái</th>
                      <th className="px-4 py-3 font-bold border-b border-gray-150 bg-gray-50 text-right rounded-tr-lg">Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders
                      .filter(isRevenueOrder)
                      .map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-bold text-gray-900">#DH-{order.id}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">{order.user?.name || 'Khách vãng lai'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                            {getOrderItemsNames(order)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {order.status === 'delivered' ? (
                              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Đã giao</span>
                            ) : (
                              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Đang xử lý</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-green-600 text-right">
                            {Number(order.total_amount).toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      ))}
                    {orders.filter(isRevenueOrder).length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400 font-medium">
                          Chưa có doanh thu đơn hàng shop nào hoàn thành trong thời gian chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="bg-gray-50 p-5 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Tổng doanh thu kết hợp:</span>
              <span className="text-2xl font-black text-green-600">{totalRevenue.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bảng hoạt động gần đây */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Lịch đặt sân gần đây</h2>
            <Link to="/admin/bookings" className="text-sm text-blue-600 hover:underline">Xem tất cả</Link>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <span className="material-symbols-outlined animate-spin text-2xl text-green-600 mr-2">sync</span>
                <span className="text-xs text-gray-400">Đang tải lịch đặt...</span>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                Chưa có lịch đặt sân nào.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Khách hàng</th>
                    <th className="px-6 py-3 font-medium">Sân / HLV</th>
                    <th className="px-6 py-3 font-medium">Thời gian</th>
                    <th className="px-6 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {booking.user?.name || 'Khách vãng lai'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {booking.court?.name || (booking.coach?.name ? `HLV: ${booking.coach.name}` : 'Sân mẫu')}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        <div>{booking.start_time} - {booking.end_time}</div>
                        <div className="text-[10px] text-gray-400 font-light mt-0.5">{booking.booking_date}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(booking.payment_status, booking.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cột phải: Đơn hàng cửa hàng */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Đơn hàng mới</h2>
          </div>
          <div className="p-6 space-y-6 flex-grow">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <span className="material-symbols-outlined animate-spin text-2xl text-green-600 mr-2">sync</span>
                <span className="text-xs text-gray-400">Đang tải đơn hàng...</span>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                Chưa có đơn hàng nào.
              </div>
            ) : (
              recentOrders.map((order) => {
                const summaryText = getOrderSummary(order);
                const customerName = order.user?.name || order.shipping_details?.name || 'Khách vãng lai';
                const statusColor = order.status === 'delivered' ? 'text-green-600 bg-green-50'
                  : order.status === 'cancelled' ? 'text-red-600 bg-red-50'
                  : order.status === 'shipped' ? 'text-cyan-600 bg-cyan-50'
                  : 'text-amber-600 bg-amber-50';
                const statusLabel = order.status === 'delivered' ? 'Đã giao'
                  : order.status === 'cancelled' ? 'Đã hủy'
                  : order.status === 'shipped' ? 'Đang giao'
                  : 'Chờ xử lý';
                
                return (
                  <div key={order.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-2xl transition border border-transparent hover:border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                      <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-gray-900 truncate">{customerName}</h4>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">#DH00{order.id}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 truncate font-medium mt-0.5">{summaryText}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <span className="text-[10px] text-gray-400">• {getRelativeTime(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-green-600">{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-gray-100 text-center mt-auto">
             <Link to="/admin/orders" className="text-sm text-blue-600 font-medium hover:underline">Quản lý Đơn hàng</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
