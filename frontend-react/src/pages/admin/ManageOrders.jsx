import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

// Ràng buộc luồng trạng thái ADMIN (khớp với backend OrderController::ADMIN_TRANSITIONS)
// Admin có thể chuyển shipped → delivered khi khách quên bấm xác nhận nhận hàng
const VALID_TRANSITIONS = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered', 'cancelled'], // Admin có thể chủ động xác nhận đã giao thay khách
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
  const location = useLocation();
  const [highlightId, setHighlightId] = useState(null);
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Sorting State
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    if (location.state?.highlightId && orders.length > 0) {
      const targetId = Number(location.state.highlightId);
      setHighlightId(targetId);
      const targetOrder = orders.find(o => o.id === targetId);
      if (targetOrder) {
        setSelectedOrder(targetOrder);
        setShowDetailModal(true);
      }
      // Tự động cuộn mượt xuống đúng đơn hàng được chọn
      setTimeout(() => {
        const el = document.getElementById(`order-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [location.state, orders]);

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

    const targetOrder = orders.find(o => o.id === id);
    const actualCurrentStatus = currentStatus || targetOrder?.status;
    if (!actualCurrentStatus || newStatus === actualCurrentStatus) return;

    // Kiểm tra ràng buộc phía client trước khi gọi API
    const allowed = VALID_TRANSITIONS[actualCurrentStatus] || [];
    const statusLabel = STATUS_LABELS[actualCurrentStatus] || actualCurrentStatus;

    if (!allowed.includes(newStatus)) {
      const allowedStr = allowed.map(s => STATUS_LABELS[s]).join(', ');
      toast.error(
        allowed.length === 0
          ? `Đơn "${statusLabel}" không thể thay đổi trạng thái nữa.`
          : `Không hợp lệ! Từ "${statusLabel}" chỉ được chuyển sang: ${allowedStr}.`
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

  const handleShowDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getProductImage = (productId) => {
    const p = products.find(prod => prod.id === productId);
    return p?.image ? `http://127.0.0.1:8000/storage/${p.image}` : 'https://placehold.co/100x100?text=Pickleball';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700',
      processing: 'bg-blue-50 text-blue-700',
      shipped: 'bg-cyan-50 text-cyan-700',
      delivered: 'bg-green-50 text-green-700',
      cancelled: 'bg-red-50 text-red-700'
    };
    return (
      <span className={`${styles[status] || 'bg-gray-50 text-gray-700'} px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase`}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const orderId = `#DH00${order.id}`.toLowerCase();
    const userName = order.user?.name?.toLowerCase() || '';
    const userPhone = order.user?.phone?.toLowerCase() || '';

    const matchesSearch = orderId.includes(searchLower) || userName.includes(searchLower) || userPhone.includes(searchLower);
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'user') {
      aVal = a.user?.name || '';
      bVal = b.user?.name || '';
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal, 'vi') 
        : bVal.localeCompare(aVal, 'vi');
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const renderSortHeader = (field, label) => (
    <th 
      onClick={() => handleSort(field)} 
      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
    >
      <div className="flex items-center gap-1.5 font-bold text-gray-700 text-xs uppercase tracking-wider">
        <span>{label}</span>
        <span className={`material-symbols-outlined text-[16px] transition-transform ${
          sortField === field ? 'text-green-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'
        } ${sortField === field && sortDirection === 'desc' ? 'rotate-180' : ''}`}>
          arrow_upward
        </span>
      </div>
    </th>
  );

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và cập nhật trạng thái các đơn hàng mua sản phẩm thể thao.</p>
        </div>
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
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái ({orders.length})</option>
              <option value="pending">Chờ xử lý ({orders.filter(o => o.status === 'pending').length})</option>
              <option value="processing">Đang xử lý ({orders.filter(o => o.status === 'processing').length})</option>
              <option value="shipped">Đang giao hàng ({orders.filter(o => o.status === 'shipped').length})</option>
              <option value="delivered">Đã giao hàng ({orders.filter(o => o.status === 'delivered').length})</option>
              <option value="cancelled">Đã hủy ({orders.filter(o => o.status === 'cancelled').length})</option>
            </select>
          </div>
        </div>

        {/* Bảng danh sách đơn hàng */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
              <span className="material-symbols-outlined animate-spin text-3xl text-green-600">autorenew</span>
              Đang tải danh sách đơn hàng...
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">receipt_long</span>
              {searchTerm || filterStatus !== 'all' ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.' : 'Chưa có đơn hàng nào trong hệ thống.'}
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {renderSortHeader('id', 'Mã Đơn')}
                  {renderSortHeader('user', 'Khách hàng')}
                  {renderSortHeader('created_at', 'Ngày đặt')}
                  {renderSortHeader('total_amount', 'Tổng tiền')}
                  {renderSortHeader('status', 'Trạng thái')}
                  <th className="px-6 py-4 text-right font-bold text-gray-700 text-xs uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    id={`order-row-${order.id}`}
                    className={order.id === highlightId ? "bg-blue-100/90 border-l-4 border-blue-500 font-extrabold shadow-sm transition-all animate-pulse" : "hover:bg-gray-50/80 transition"}
                  >
                    <td className="px-6 py-4 font-bold text-gray-900">
                      #DH00{order.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{order.user?.name || 'Khách vãng lai'}</div>
                      <div className="text-xs text-gray-400 font-light">{order.user?.phone || order.user?.email || 'Chưa có SĐT'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-xs text-gray-400 font-light">
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-green-600 text-sm">
                      {Number(order.total_amount).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleShowDetail(order)}
                          className="text-gray-600 hover:text-green-600 flex items-center p-1.5 bg-gray-100 hover:bg-green-50 rounded-lg transition cursor-pointer border-0"
                          title="Xem chi tiết đơn"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>

                        {(VALID_TRANSITIONS[order.status] || []).length > 0 ? (
                          <select
                            value={order.status}
                            disabled={updatingStatusId === order.id}
                            onChange={e => handleUpdateStatus(order.id, e.target.value, order.status)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-green-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value={order.status} disabled>{STATUS_LABELS[order.status] || order.status}</option>
                            {(VALID_TRANSITIONS[order.status] || []).map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium italic px-2 py-1 bg-gray-100 text-gray-500 rounded-md">
                            Đã khóa
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CHI TIẾT ĐƠN HÀNG MODAL */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="p-6 bg-gradient-to-r from-gray-900 to-green-900 text-white flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">Chi Tiết Đơn Hàng #DH00{selectedOrder.id}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-gray-300 mt-1">Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }}
                className="text-white/80 hover:text-white border-0 bg-transparent cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Thông tin khách hàng & Giao hàng */}
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
            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
              <button 
                type="button"
                onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition flex items-center justify-center border-0"
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
