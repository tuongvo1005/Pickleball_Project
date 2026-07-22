import { useState, useEffect } from 'react';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

// Ràng buộc luồng trạng thái ADMIN (khớp với backend OrderController::ADMIN_TRANSITIONS)
// Admin không thể tự đặt "delivered" — chỉ khách hàng xác nhận nhận hàng
const VALID_TRANSITIONS = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['cancelled'],          // Chỉ có thể hủy, không tự đánh "đã giao"
  delivered:  [],
  cancelled:  [],
};

const STATUS_LABELS = {
  pending:    'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped:    'Đang giao hàng',
  delivered:  'Đã giao hàng',
  cancelled:  'Đã hủy',
};

const ManageOrders = () => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Fetch all orders and products
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        axiosClient.get('/orders'),
        axiosClient.get('/products')
      ]);

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
      if (productsRes.data.success) {
        setProducts(productsRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể kết nối đến máy chủ để tải dữ liệu đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getProductName = (productId) => {
    const prod = products.find(p => p.id === productId);
    return prod ? prod.name : `Sản phẩm #${productId}`;
  };

  const handleUpdateStatus = async (id, newStatus, currentStatus) => {
    if (!newStatus) return;

    // Kiểm tra ràng buộc phía client trước khi gọi API
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      const allowedStr = allowed.map(s => STATUS_LABELS[s]).join(', ');
      toast.error(
        allowed.length === 0
          ? `Đơn "${STATUS_LABELS[currentStatus]}" không thể thay đổi trạng thái.`
          : `Không hợp lệ! Từ "${STATUS_LABELS[currentStatus]}" chỉ được chuyển sang: ${allowedStr}.`
      );
      return;
    }

    setUpdatingStatusId(id);
    try {
      const res = await axiosClient.put(`/orders/${id}`, { status: newStatus });
      if (res.data.success) {
        setOrders(orders.map(order => order.id === id ? { ...order, status: newStatus } : order));
        toast.success(res.data.message || `Cập nhật trạng thái đơn #DH00${id} thành công!`);
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đơn hàng.';
      toast.error(msg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      toast.warning('Không có dữ liệu đơn hàng để xuất!');
      return;
    }
    // BOM UTF-8 for Vietnamese Excel export
    let csvContent = '\uFEFF'; // Include BOM for UTF-8 (Vietnamese Excel support)
    csvContent += 'Mã Đơn,Khách hàng,Email,Số điện thoại,Ngày đặt,Tổng tiền,Trạng thái\n';
    
    orders.forEach(order => {
      const id = `#DH00${order.id}`;
      const name = order.user?.name || 'Khách vãng lai';
      const email = order.user?.email || '—';
      const phone = order.user?.phone || '—';
      const date = new Date(order.created_at).toLocaleDateString('vi-VN');
      const total = order.total_amount;
      let statusStr = 'Chờ xử lý';
      if (order.status === 'processing') statusStr = 'Đang xử lý';
      if (order.status === 'shipped') statusStr = 'Đang giao hàng';
      if (order.status === 'delivered') statusStr = 'Đã giao hàng';
      if (order.status === 'cancelled') statusStr = 'Đã hủy';
      
      csvContent += `"${id}","${name}","${email}","${phone}","${date}",${total},"${statusStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Don_Hang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Xuất báo cáo đơn hàng dạng CSV thành công!');
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = order.items.map(item => {
      const name = getProductName(item.product_id);
      const subtotal = item.quantity * item.unit_price;
      return `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px;">${name}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${Number(item.unit_price).toLocaleString('vi-VN')}đ</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; font-size: 14px; color: #16a34a;">${Number(subtotal).toLocaleString('vi-VN')}đ</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn mua hàng #DH00${order.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; }
            .invoice-box { max-width: 800px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, .05); }
            .invoice-header { display: flex; justify-content: space-between; border-bottom: 3px solid #16a34a; padding-bottom: 25px; margin-bottom: 30px; }
            .invoice-title { font-size: 26px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-info { text-align: right; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; background-color: #f9fafb; padding: 20px; border-radius: 8px; }
            .details-column { flex: 1; }
            .details-column strong { color: #111827; display: block; margin-bottom: 8px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #4b5563; }
            .total-row { font-size: 20px; font-weight: 900; text-align: right; padding-top: 30px; color: #16a34a; border-top: 2px solid #e5e7eb; margin-top: 20px; }
          </style>
        </head>
        <body>
            <div class="invoice-box">
              <div class="invoice-header">
                <div>
                  <div class="invoice-title">PickleBall Pro</div>
                  <div style="font-size: 13px; color: #6b7280; mt-1;">Hệ Thống Đặt Sân & Cửa Hàng Pickleball Cao Cấp</div>
                  <div style="font-size: 13px; color: #6b7280;">Địa chỉ: 238 Ba Tháng Hai, Q. 10, TP. HCM | SĐT: 0987.654.321</div>
                </div>
                <div class="invoice-info">
                  <div style="font-weight: 900; font-size: 20px; color: #111827;">HÓA ĐƠN BÁN HÀNG</div>
                  <div style="font-weight: bold; color: #ef4444; font-size: 14px; margin-top: 4px;">Mã đơn: #DH00${order.id}</div>
                  <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Ngày lập: ${new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              <div class="invoice-details">
                <div class="details-column">
                  <strong>Thông tin người mua:</strong>
                  <div style="font-size: 14px; font-weight: bold; color: #111827;">${order.user?.name || 'Khách vãng lai'}</div>
                  <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">Điện thoại: ${order.user?.phone || '—'}</div>
                  <div style="font-size: 13px; color: #4b5563;">Email: ${order.user?.email || '—'}</div>
                </div>
                <div class="details-column" style="text-align: right;">
                  <strong>Thông tin giao nhận & thanh toán:</strong>
                  <div style="font-size: 13px; color: #4b5563;">Trạng thái: <span style="font-weight: bold; color: #16a34a;">${
                    order.status === 'pending' ? 'Chờ xử lý' :
                    order.status === 'processing' ? 'Đang xử lý' :
                    order.status === 'shipped' ? 'Đang giao hàng' :
                    order.status === 'delivered' ? 'Đã giao hàng' : 'Đã hủy'
                  }</span></div>
                  <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">Phương thức: ${
                    order.shipping_details?.paymentMethod === 'cod' ? 'Thanh toán COD' : 'Thanh toán trực tuyến (VNPay)'
                  }</div>
                  <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">Hình thức: ${
                    order.shipping_details?.deliveryMethod === 'counter' ? 'Nhận tại quầy bán CLB' : 'Giao hàng tận nơi'
                  }</div>
                  <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">Địa chỉ: ${
                    order.shipping_details?.address || '—'
                  }</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th style="text-align: center;">Đơn giá</th>
                    <th style="text-align: center;">Số lượng</th>
                    <th style="text-align: right;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              <div class="total-row">
                TỔNG CỘNG: ${Number(order.total_amount).toLocaleString('vi-VN')}đ
              </div>
              <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 20px;">
                Cảm ơn quý khách đã tin tưởng và đồng hành cùng PickleBall Pro! Hẹn gặp lại quý khách!
              </div>
            </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShowDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>Chờ xử lý</span>;
      case 'processing':
        return <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Đang xử lý</span>;
      case 'shipped':
        return <span className="bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>Đang giao</span>;
      case 'delivered':
        return <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Hoàn thành</span>;
      case 'cancelled':
        return <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Đã hủy</span>;
      default:
        return <span className="bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1">Chờ xử lý</span>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchSearch = order.id.toString().includes(searchTerm) || 
                        (order.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (order.user?.phone || '').includes(searchTerm);
    const matchStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và cập nhật trạng thái các đơn hàng mua sản phẩm thể thao.</p>
        </div>
        <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer border-0">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Xuất báo cáo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tìm kiếm & Bộ lọc */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã đơn, khách hàng hoặc số điện thoại..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all placeholder:text-gray-400" 
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all font-semibold text-gray-700 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="shipped">Đang giao hàng</option>
            <option value="delivered">Đã giao hàng</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {/* Bảng đơn hàng */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24">
            <span className="material-symbols-outlined animate-spin text-5xl text-green-600 mb-3">refresh</span>
            <span className="text-gray-500 font-medium">Đang tải danh sách đơn hàng...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">receipt_long</span>
            <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Mã Đơn</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Ngày đặt</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-extrabold text-gray-500">#DH00{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{order.user?.name || 'Khách vãng lai'}</div>
                      <div className="text-xs text-gray-400 font-medium">{order.user?.phone || 'Chưa cập nhật SĐT'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-green-600 text-sm">
                        {Number(order.total_amount).toLocaleString('vi-VN')}đ
                      </div>
                      <div className="text-xs text-gray-400 font-light mt-0.5">({order.items?.length || 0} sản phẩm)</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {updatingStatusId === order.id ? (
                          <span className="material-symbols-outlined animate-spin text-green-600 text-[18px]">autorenew</span>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleShowDetail(order)} 
                              className="text-blue-600 font-bold hover:text-blue-800 text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition border-0 cursor-pointer"
                            >
                              Chi tiết
                            </button>
                            {/* Dropdown chỉ hiển thị các trạng thái cho phép */}
                            {(VALID_TRANSITIONS[order.status] || []).length > 0 ? (
                              <select 
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value, order.status)} 
                                className="border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 bg-white outline-none text-gray-600 cursor-pointer hover:border-green-500 transition-colors font-semibold shadow-xs"
                                value=""
                              >
                                <option value="" disabled>Cập nhật</option>
                                {(VALID_TRANSITIONS[order.status] || []).map(s => (
                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-gray-400 italic px-2">Đã kết thúc</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG PREMIUM */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-green-600 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide flex items-center gap-2">
                    CHI TIẾT ĐƠN HÀNG #DH00{selectedOrder.id}
                  </h3>
                  <p className="text-green-100 text-xs mt-0.5">Đặt ngày: {new Date(selectedOrder.created_at).toLocaleDateString('vi-VN')} | Giờ: {new Date(selectedOrder.created_at).toLocaleTimeString('vi-VN')}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }} 
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition cursor-pointer border-0 bg-transparent flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              
              {/* Grid 2 cột thông tin khách hàng và thanh toán */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    Thông tin Khách hàng
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="font-extrabold text-gray-800">{selectedOrder.user?.name || 'Khách vãng lai'}</div>
                    <div className="text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-gray-400">phone</span> {selectedOrder.user?.phone || '—'}</div>
                    <div className="text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-gray-400">mail</span> {selectedOrder.user?.email || '—'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Trạng thái & Thanh toán
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium">Trạng thái:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="text-gray-600">
                      <span className="text-gray-500 font-medium">Hình thức:</span>{' '}
                      <strong className="text-gray-700">
                        {selectedOrder.shipping_details?.paymentMethod === 'cod' ? 'Thanh toán COD' : 'Thanh toán trực tuyến (VNPay)'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin Giao nhận hàng / Đặt cọc dụng cụ thuê */}
              {selectedOrder.shipping_details && (
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-sm space-y-3">
                  <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    Phương Thức Giao Nhận & Đặt Cọc
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-gray-500">Hình thức nhận hàng:</span>{' '}
                        <span className="font-extrabold text-blue-800">
                          {selectedOrder.shipping_details.deliveryMethod === 'counter' ? 'Nhận tại quầy bán CLB' : 'Giao hàng tận nơi'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Người nhận:</span>{' '}
                        <span className="font-bold text-gray-800">{selectedOrder.shipping_details.name || selectedOrder.user?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">SĐT nhận hàng:</span>{' '}
                        <span className="font-bold text-gray-800">{selectedOrder.shipping_details.phone || selectedOrder.user?.phone}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-gray-500">Địa chỉ giao/nhận:</span>{' '}
                        <span className="font-bold text-gray-800">{selectedOrder.shipping_details.address}</span>
                      </div>
                      {Number(selectedOrder.shipping_details.totalDeposit) > 0 && (
                        <div>
                          <span className="text-gray-500">Tiền đặt cọc dụng cụ thuê:</span>{' '}
                          <span className="font-extrabold text-emerald-600">
                            {Number(selectedOrder.shipping_details.totalDeposit).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      )}
                      {selectedOrder.shipping_details.note && (
                        <div>
                          <span className="text-gray-500">Ghi chú:</span>{' '}
                          <span className="text-gray-700 italic">"{selectedOrder.shipping_details.note}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bảng sản phẩm đã mua */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  Danh sách Sản phẩm
                </h4>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-bold text-xs uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 font-bold text-xs uppercase text-center">Đơn giá</th>
                        <th className="px-4 py-3 font-bold text-xs uppercase text-center">Số lượng</th>
                        <th className="px-4 py-3 font-bold text-xs uppercase text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.items?.map((item, index) => {
                        const subtotal = item.quantity * item.unit_price;
                        return (
                          <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-gray-800">{getProductName(item.product_id)}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">Mã SP: #{item.product_id}</div>
                            </td>
                            <td className="px-4 py-3.5 text-center text-gray-600 font-medium">
                              {Number(item.unit_price).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-gray-800">
                              x{item.quantity}
                            </td>
                            <td className="px-4 py-3.5 text-right font-extrabold text-green-600">
                              {subtotal.toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tóm tắt thanh toán */}
              <div className="flex justify-between items-end border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cập nhật nhanh trạng thái</label>
                  {(VALID_TRANSITIONS[selectedOrder.status] || []).length > 0 ? (
                    <select 
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value, selectedOrder.status)}
                      className="border border-gray-200 rounded-xl text-xs px-3 py-2 bg-white outline-none font-bold text-gray-700 cursor-pointer hover:border-green-500 transition-colors"
                    >
                      <option value={selectedOrder.status} disabled>{STATUS_LABELS[selectedOrder.status]} (hiện tại)</option>
                      {(VALID_TRANSITIONS[selectedOrder.status] || []).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-gray-500 italic bg-gray-100 px-3 py-2 rounded-xl">
                      Trạng thái <strong>{STATUS_LABELS[selectedOrder.status]}</strong> — không thể thay đổi thêm.
                    </div>
                  )}
                  {/* Lưu ý khi đang giao hàng */}
                  {selectedOrder.status === 'shipped' && (
                    <p className="text-[10px] text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 rounded-lg mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">info</span>
                      Đơn đang giao — chỉ khách hàng mới có thể xác nhận "Đã nhận hàng".
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-400 uppercase block tracking-wider mb-1">TỔNG THANH TOÁN</span>
                  <span className="text-2xl font-black text-green-600">
                    {Number(selectedOrder.total_amount).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
              <button 
                onClick={() => handlePrintInvoice(selectedOrder)}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-bold py-3.5 px-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <span className="material-symbols-outlined text-[20px] text-green-600">print</span>
                In Hóa Đơn
              </button>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition flex items-center justify-center"
              >
                Đóng hộp thoại
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ManageOrders;
