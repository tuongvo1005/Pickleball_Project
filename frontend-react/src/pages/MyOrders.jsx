import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:    { label: 'Chờ xử lý',      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400',  icon: 'pending' },
  processing: { label: 'Đang xử lý',     color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500',    icon: 'autorenew' },
  shipped:    { label: 'Đang giao hàng', color: 'bg-cyan-50 text-cyan-700 border-cyan-200',         dot: 'bg-cyan-500',    icon: 'local_shipping' },
  delivered:  { label: 'Đã giao hàng',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: 'check_circle' },
  cancelled:  { label: 'Đã hủy',         color: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-400',     icon: 'cancel' },
};

const PAYMENT_LABELS = {
  cod:  'Tiền mặt khi nhận (COD)',
  momo: 'Ví MoMo',
  bank: 'Chuyển khoản',
};

// Thanh tiến trình trạng thái (chỉ cho đơn chưa hủy)
const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

const StatusStepper = ({ status }) => {
  if (status === 'cancelled') return null;
  const currentIdx = ORDER_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 w-full mt-3 mb-1">
      {ORDER_STEPS.map((step, idx) => {
        const done  = idx <= currentIdx;
        const cfg   = STATUS_MAP[step];
        const last  = idx === ORDER_STEPS.length - 1;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-300'
              }`}>
                <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
              </div>
              <span className={`text-[9px] font-bold mt-1 text-center leading-tight ${done ? 'text-green-700' : 'text-gray-400'}`}>
                {cfg.label}
              </span>
            </div>
            {!last && (
              <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${idx < currentIdx ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Component chính ──────────────────────────────────────────────────────────
const MyOrders = () => {
  const { user, token } = useAuthContext();
  const toast   = useToast();
  const navigate = useNavigate();

  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [expandedId,    setExpandedId]    = useState(null);
  const [confirmingId,  setConfirmingId]  = useState(null); // đang gọi API xác nhận
  const [products,      setProducts]      = useState([]);

  // ── Fetch dữ liệu ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const [ordersRes, productsRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/orders?user_id=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://127.0.0.1:8000/api/products'),
      ]);
      if (ordersRes.data.success) setOrders(ordersRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Xác nhận đã nhận hàng (gọi endpoint riêng dành cho khách) ──────────────
  const handleConfirmReceived = async (order) => {
    if (order.status !== 'shipped') return;
    setConfirmingId(order.id);
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/orders/${order.id}/confirm-received`,
        { user_id: user.id },          // Backend kiểm tra đúng chủ đơn hàng
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o));
        toast.success(res.data.message || `Đơn hàng #DH00${order.id} đã xác nhận giao thành công!`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi xác nhận nhận hàng.';
      toast.error(msg);
    } finally {
      setConfirmingId(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getProductName = (productId) => {
    const p = products.find(p => p.id === productId);
    return p ? p.name : `Sản phẩm #${productId}`;
  };

  const filteredOrders = orders.filter(o =>
    filterStatus === 'all' ? true : o.status === filterStatus
  );

  const getStatusBadge = (status) => {
    const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-gray-300">lock</span>
        <p className="text-gray-500 font-medium">Bạn cần đăng nhập để xem đơn hàng.</p>
        <button onClick={() => navigate('/login')} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition">
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 text-3xl">receipt_long</span>
            Đơn Hàng Của Tôi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi và xác nhận các đơn hàng bạn đã đặt.</p>
        </div>
        <button
          onClick={() => navigate('/shop')}
          className="flex items-center gap-1.5 text-sm font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition border border-green-200"
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          Tiếp tục mua
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { key: 'all',        label: 'Tất cả' },
          { key: 'pending',    label: 'Chờ xử lý' },
          { key: 'processing', label: 'Đang xử lý' },
          { key: 'shipped',    label: 'Đang giao' },
          { key: 'delivered',  label: 'Đã nhận' },
          { key: 'cancelled',  label: 'Đã hủy' },
        ].map(tab => {
          const count = tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                filterStatus === tab.key
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterStatus === tab.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Nội dung ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="material-symbols-outlined animate-spin text-5xl text-green-600">refresh</span>
          <span className="text-gray-500 font-medium">Đang tải đơn hàng...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="material-symbols-outlined text-6xl text-gray-200 block mb-4">inbox</span>
          <p className="text-gray-400 font-medium">
            {filterStatus === 'all' ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn nào ở trạng thái này.'}
          </p>
          <button onClick={() => navigate('/shop')} className="mt-4 text-green-600 font-bold text-sm hover:underline">
            Khám phá cửa hàng →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isExpanded  = expandedId === order.id;
            const isShipped   = order.status === 'shipped';
            const isConfirming = confirmingId === order.id;
            const payMethod    = order.shipping_details?.paymentMethod;
            const delivery     = order.shipping_details?.deliveryMethod;
            const items        = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-sm transition-all ${
                  isShipped ? 'border-cyan-300 ring-1 ring-cyan-200' : 'border-gray-100'
                }`}
              >
                {/* ── Card header ── */}
                <div
                  className="p-5 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Mã + ngày */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-800 text-base">#DH00{order.id}</span>
                        {getStatusBadge(order.status)}
                        {isShipped && (
                          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full animate-pulse">
                            🚚 Đang trên đường giao
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Đặt ngày {new Date(order.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' · '}{items.length} sản phẩm
                      </p>
                    </div>

                    {/* Tổng tiền + expand */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Tổng tiền</p>
                        <p className="font-extrabold text-green-600 text-lg">
                          {Number(order.total_amount).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <span className={`material-symbols-outlined text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Stepper */}
                  <StatusStepper status={order.status} />

                  {/* ── Nút ĐÃ NHẬN HÀNG (chỉ khi shipped) ── */}
                  {isShipped && (
                    <div className="mt-4 pt-4 border-t border-cyan-100" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm text-cyan-800 font-medium flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-cyan-600">info</span>
                          Bạn đã nhận được hàng chưa? Xác nhận để hoàn tất đơn hàng.
                        </p>
                        <button
                          onClick={() => handleConfirmReceived(order)}
                          disabled={isConfirming}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm cursor-pointer border-0 shrink-0"
                        >
                          {isConfirming ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                              Đang xử lý...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              Đã nhận hàng
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Nội dung mở rộng ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 space-y-5 pt-4">

                    {/* Thông tin giao hàng */}
                    {order.shipping_details && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span> Thông tin nhận hàng
                          </p>
                          <p className="font-bold text-gray-800">{order.shipping_details.name}</p>
                          <p className="text-gray-600">{order.shipping_details.phone}</p>
                          <p className="text-gray-600 flex items-start gap-1">
                            <span className="material-symbols-outlined text-[14px] mt-0.5 text-gray-400">location_on</span>
                            {order.shipping_details.address || '—'}
                          </p>
                          {order.shipping_details.note && (
                            <p className="text-gray-500 italic text-xs">Ghi chú: "{order.shipping_details.note}"</p>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">payments</span> Thanh toán & Giao nhận
                          </p>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phương thức:</span>
                            <span className="font-bold text-gray-800">{PAYMENT_LABELS[payMethod] || payMethod || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Hình thức:</span>
                            <span className="font-bold text-gray-800">
                              {delivery === 'counter' ? 'Nhận tại quầy CLB' : 'Giao tận nơi'}
                            </span>
                          </div>
                          {Number(order.shipping_details.totalDeposit) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Đặt cọc:</span>
                              <span className="font-bold text-emerald-600">
                                {Number(order.shipping_details.totalDeposit).toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Danh sách sản phẩm */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                        Sản phẩm đã mua
                      </p>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        {items.map((item, idx) => (
                          <div key={idx} className={`flex items-center justify-between px-4 py-3 text-sm ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                            <div>
                              <p className="font-bold text-gray-800">
                                {item.isRental ? item.name : getProductName(item.product_id)}
                              </p>
                              {item.isRental && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Thuê</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-gray-500 text-xs">x{item.quantity}</p>
                              <p className="font-extrabold text-green-600">
                                {(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <span className="font-bold text-gray-600 text-sm">Tổng cộng</span>
                          <span className="font-extrabold text-green-600 text-base">
                            {Number(order.total_amount).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
