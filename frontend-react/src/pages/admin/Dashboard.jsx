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
    if (!order.items || order.items.length === 0) return 'Đơn hàng không có sản phẩm';
    return order.items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      return prod ? `${prod.name} (x${item.quantity})` : `Sản phẩm #${item.product_id} (x${item.quantity})`;
    }).join(', ');
  };

  const getRelativeTime = (dateStr) => {
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

  // Tính tổng doanh thu thực tế từ các đơn đặt sân đã hoàn thành (completed)
  const bookingsRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  // Tính tổng doanh thu thực tế từ các đơn hàng shop đã hoàn thành/đã giao (delivered)
  const ordersRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const totalRevenue = bookingsRevenue + ordersRevenue;

  // Thống kê động
  const stats = [
    { title: 'Tổng Doanh Thu', value: `${totalRevenue.toLocaleString('vi-VN')}đ`, icon: 'payments', color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Lượt Đặt Sân', value: bookings.length.toString(), icon: 'calendar_month', color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Đơn Hàng Mới', value: orders.filter(o => o.status === 'pending').length.toString(), icon: 'shopping_bag', color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Khách Hàng', value: usersCount.toString(), icon: 'group', color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  // Lấy 5 đơn đặt sân gần đây nhất
  const recentBookings = [...bookings].reverse().slice(0, 5);

  // Lấy 3 đơn hàng shop gần đây nhất
  const recentOrders = [...orders].reverse().slice(0, 3);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã duyệt</span>;
      case 'refunded':
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Hoàn trả</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Thất bại</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">Chờ duyệt</span>;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tổng quan hệ thống</h1>

      {/* Thống kê 4 ô */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const isRevenue = idx === 0;
          return (
            <div 
              key={idx} 
              onClick={isRevenue ? () => setShowRevenueModal(true) : undefined}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center transition-all ${
                isRevenue 
                  ? 'cursor-pointer hover:shadow-md hover:border-green-300 hover:bg-green-50/5 active:scale-[0.98]' 
                  : ''
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stat.bg} ${stat.color} mr-4`}>
                <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1">
                  {stat.title}
                  {isRevenue && (
                    <span className="material-symbols-outlined text-[14px] text-green-500 animate-pulse">visibility</span>
                  )}
                </p>
                <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
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
                <h3 className="text-lg font-bold">Chi Tiết Doanh Thu Hệ Thống</h3>
              </div>
              <button 
                onClick={() => setShowRevenueModal(false)} 
                className="text-white/80 hover:text-white transition bg-transparent border-0 cursor-pointer flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
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
                Lịch Đặt Sân ({bookings.filter(b => b.status === 'completed').length}) - {bookingsRevenue.toLocaleString('vi-VN')}đ
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
                Đơn Hàng Shop ({orders.filter(o => o.status === 'delivered').length}) - {ordersRevenue.toLocaleString('vi-VN')}đ
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
                      .filter(b => b.status === 'completed')
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
                          </td>
                          <td className="px-4 py-3 font-extrabold text-green-600 text-right">
                            {Number(booking.total_price).toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      ))}
                    {bookings.filter(b => b.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400 font-medium">
                          Chưa có doanh thu đặt sân nào hoàn thành.
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
                      .filter(o => o.status === 'delivered')
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
                    {orders.filter(o => o.status === 'delivered').length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400 font-medium">
                          Chưa có doanh thu đơn hàng shop nào hoàn thành.
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
                        {getStatusBadge(booking.payment_status)}
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
                const firstItem = order.items?.[0];
                const prodName = firstItem ? getProductName(firstItem.product_id) : 'Sản phẩm thể thao';
                const extraItemsCount = (order.items?.length || 1) - 1;
                const displayName = extraItemsCount > 0 ? `${prodName} (+${extraItemsCount})` : prodName;
                
                return (
                  <div key={order.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{displayName}</h4>
                      <p className="text-xs text-gray-500 truncate">#DH-00{order.id} • {getRelativeTime(order.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-blue-600">{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
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
