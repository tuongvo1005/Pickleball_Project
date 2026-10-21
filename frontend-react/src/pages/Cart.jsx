import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Cart = () => {
  const { user } = useAuthContext();
  const toast = useToast();
  const [cartItems, setCartItems] = useState([]);
  
  // Các trạng thái của luồng thanh toán nâng cao
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  
  // Thông tin giao nhận hàng
  const [shippingName, setShippingName] = useState(user?.name || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('home'); // home: tại nhà, counter: tại quầy
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessDetails, setOrderSuccessDetails] = useState(null);
  
  // Đợi thanh toán giả lập
  const [paymentStep, setPaymentStep] = useState('waiting'); // waiting, processing, success
  const [countdown, setCountdown] = useState(300); // 5 phút đếm ngược

  // Đồng bộ thông tin user khi tải trang
  useEffect(() => {
    if (user) {
      setShippingName(user.name || '');
      setShippingPhone(user.phone || '');
    }
  }, [user]);

  // Tải dữ liệu giỏ hàng từ localStorage khi vào trang hoặc user thay đổi
  useEffect(() => {
    const cartKey = user ? `cart_${user.id}` : 'cart';
    const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    setCartItems(savedCart);
  }, [user]);

  // Hàm helper để lưu và cập nhật state
  const saveCart = (newCart) => {
    setCartItems(newCart);
    const cartKey = user ? `cart_${user.id}` : 'cart';
    localStorage.setItem(cartKey, JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = (id, delta) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty > 0 ? newQty : 1 };
      }
      return item;
    });
    saveCart(newCart);
  };

  const removeItem = (id) => {
    const newCart = cartItems.filter(item => item.id !== id);
    saveCart(newCart);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDeposit = cartItems.reduce((sum, item) => sum + (item.isRental ? (item.deposit * item.quantity) : 0), 0);
  const shipping = deliveryMethod === 'counter' ? 0 : (subtotal > 2000000 ? 0 : 35000); // Nhận tại quầy -> 0đ tiền ship
  const total = subtotal + shipping + totalDeposit;

  // Kiểm tra xem đơn hàng có chứa sản phẩm mua đứt hay không
  const hasPurchase = cartItems.some(item => !item.isRental);

  // Đếm ngược chuyển khoản giả lập
  useEffect(() => {
    if (orderSuccessDetails && paymentStep === 'waiting' && (paymentMethod === 'momo' || paymentMethod === 'bank')) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [orderSuccessDetails, paymentStep, paymentMethod]);

  const handleSimulateShopPaymentSuccess = () => {
    if (!orderSuccessDetails) return;
    setPaymentStep('processing');
    
    axios.put(`http://127.0.0.1:8000/api/orders/${orderSuccessDetails.id}`, {
      status: 'processing'
    })
    .then(() => {
      setPaymentStep('success');
      toast.success('Hệ thống đã nhận được tiền! Giao dịch thành công.');
    })
    .catch(err => {
      console.error("Lỗi cập nhật trạng thái đơn hàng:", err);
      setPaymentStep('success');
      toast.success('Giao dịch thành công (Simulated UAT)!');
    });
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCheckoutStep(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Chỉ yêu cầu địa chỉ khi có sản phẩm mua đứt và chọn giao tại nhà
    if (hasPurchase && deliveryMethod === 'home' && !shippingAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ nhận hàng!');
      return;
    }
    if (!shippingName.trim() || !shippingPhone.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên và Số điện thoại liên hệ!');
      return;
    }

    setIsSubmitting(true);

    const postItems = cartItems.map(item => ({
      product_id: item.product_id || item.id,
      quantity: item.quantity,
      unit_price: item.price,
      // Metadata phụ để Laravel lưu trữ chi tiết lịch thuê
      isRental: !!item.isRental,
      rentalDetails: item.isRental ? {
        startDate: item.rentalStartDate,
        startTime: item.rentalStartTime,
        endTime: item.rentalEndTime,
        hours: item.rentalHours,
        deposit: item.deposit
      } : null
    }));

    const orderPayload = {
      user_id: user.id,
      items: postItems,
      total_amount: total,
      status: paymentMethod === 'cod' ? 'processing' : 'pending',
      shipping_details: {
        name: shippingName,
        phone: shippingPhone,
        // Nếu chỉ thuê: luôn nhận tại quầy, không có địa chỉ
        address: !hasPurchase
          ? 'Nhận dụng cụ thuê tại quầy lễ tân CLB (238 Ba Tháng Hai, Quận 10)'
          : deliveryMethod === 'counter'
            ? 'Nhận tại quầy lễ tân CLB (238 Ba Tháng Hai, Quận 10)'
            : shippingAddress,
        note: shippingNote,
        paymentMethod: paymentMethod,
        totalDeposit: totalDeposit,
        deliveryMethod: !hasPurchase ? 'counter' : deliveryMethod
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/orders', orderPayload);
      if (response.data && response.data.success) {
        toast.success('Đặt hàng thành công!');
        setOrderSuccessDetails(response.data.data);
        saveCart([]); // Xóa giỏ hàng khi đã tạo đơn hàng thành công
      } else {
        toast.error('Có lỗi xảy ra khi tạo đơn hàng.');
      }
    } catch (err) {
      console.error("Lỗi đặt hàng:", err);
      toast.error('Không thể kết nối đến máy chủ đặt hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Định dạng đếm ngược mm:ss
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 pt-20 flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
          <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">lock</span>
          <p className="text-gray-600 mb-6 font-semibold text-lg">Vui lòng đăng nhập để xem giỏ hàng và thanh toán.</p>
          <a href="/login" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors inline-block shadow-sm">
            Đăng Nhập Ngay
          </a>
        </div>
      </div>
    );
  }

  // MÀN HÌNH KẾT QUẢ ĐẶT HÀNG THÀNH CÔNG
  if (orderSuccessDetails) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 pt-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-150 overflow-hidden">
            
            {/* Header trạng thái */}
            <div className="p-8 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
              <span className="material-symbols-outlined text-6xl mb-3 block animate-bounce">check_circle</span>
              <h2 className="text-3xl font-extrabold tracking-tight">Đặt Hàng Thành Công!</h2>
              <p className="text-blue-100 mt-2 text-sm">
                Mã đơn hàng: <span className="font-bold text-white bg-blue-500/50 px-2 py-0.5 rounded">#PB-{orderSuccessDetails.id}</span>
              </p>
            </div>

            {/* Thông tin COD */}
            {paymentMethod === 'cod' && (
              <div className="p-8 border-b border-gray-100 bg-emerald-50">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">payments</span>
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-extrabold text-emerald-800 text-lg mb-1">Thanh toán khi nhận hàng (COD)</h3>
                    <p className="text-sm text-emerald-700 mb-3">Đơn hàng của bạn đã được xác nhận. Vui lòng chuẩn bị đúng số tiền khi nhận hàng.</p>
                    <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mã đơn hàng:</span>
                        <span className="font-bold text-gray-900">#PB-{orderSuccessDetails.id}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-emerald-100 pt-2">
                        <span className="text-gray-500">Số tiền cần trả:</span>
                        <span className="font-extrabold text-emerald-700 text-lg">
                          {Number(orderSuccessDetails.total_amount || orderSuccessDetails.total_price || total).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-lg mt-2">
                        💡 Nhân viên giao hàng sẽ liên hệ trước khi đến. Vui lòng chuẩn bị tiền mặt đúng số tiền trên.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết giao dịch thanh toán trực tuyến (Giả lập VietQR / MoMo) */}
            {(paymentMethod === 'momo' || paymentMethod === 'bank') && (
              <div className="p-8 border-b border-gray-100 bg-slate-50 flex flex-col md:flex-row items-center gap-8">
                
                {/* Khu vực mã QR */}
                <div className={`shrink-0 flex flex-col items-center bg-white p-4 rounded-2xl border shadow-sm relative ${paymentMethod === 'momo' ? 'border-[#d82d8b]/30' : 'border-gray-200'}`}>
                  {paymentStep === 'success' && (
                    <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-4">
                      <span className={`material-symbols-outlined text-6xl animate-pulse mb-2 ${paymentMethod === 'momo' ? 'text-pink-600' : 'text-emerald-500'}`}>verified</span>
                      <span className={`font-extrabold text-sm uppercase tracking-wider ${paymentMethod === 'momo' ? 'text-pink-600' : 'text-emerald-600'}`}>Đã Thanh Toán</span>
                    </div>
                  )}

                  {paymentStep === 'processing' ? (
                    <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-3">
                      <span className={`material-symbols-outlined text-4xl animate-spin ${paymentMethod === 'momo' ? 'text-[#d82d8b]' : 'text-blue-600'}`}>sync</span>
                      <span className="text-xs text-gray-500 font-bold">Đang kiểm tra...</span>
                    </div>
                  ) : paymentMethod === 'momo' ? (
                    <div className="relative">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=momo://payment?amount=${orderSuccessDetails.total_amount || total}&orderId=PB-SHOP-${orderSuccessDetails.id}`} 
                        alt="MoMo UAT Sandbox Payment QR"
                        className="w-[180px] h-[180px] object-contain rounded-lg" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none">
                        <div className="w-10 h-10 bg-[#d82d8b] rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-white font-black text-[10px]">momo</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={`https://api.vietqr.io/image/970415-123456789999-vietqr_net.jpg?accountName=CLB%20PICKLEBALL%20PRO&amount=${orderSuccessDetails.total_amount || total}&addInfo=CK%20PB%20${orderSuccessDetails.id}`} 
                      alt="VietQR Payment Code"
                      className="w-[180px] h-[180px] object-contain mix-blend-multiply" 
                    />
                  )}
                  <span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                    {paymentMethod === 'momo' ? 'Quét QR qua app MoMo Sandbox' : 'Quét mã bằng app ngân hàng'}
                  </span>
                </div>

                {/* Chi tiết thanh toán */}
                <div className="flex-grow w-full text-sm space-y-3">
                  <h3 className={`font-extrabold text-lg flex items-center gap-1.5 ${paymentMethod === 'momo' ? 'text-[#d82d8b]' : 'text-blue-600'}`}>
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                    Cổng Thanh Toán Trực Tuyến
                  </h3>
                  
                  {paymentStep === 'waiting' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3.5 py-2 rounded-xl border border-amber-200 text-xs font-semibold">
                        <span className="material-symbols-outlined animate-spin text-[16px]">hourglass_empty</span>
                        Đang chờ bạn quét thanh toán... (Đếm ngược: {formatCountdown(countdown)})
                      </div>

                      <button 
                        type="button"
                        onClick={handleSimulateShopPaymentSuccess}
                        className={`w-full text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer border-0 text-xs ${
                          paymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        Xác nhận đã thanh toán đơn hàng (Test)
                      </button>
                    </div>
                  )}

                  {paymentStep === 'success' && (
                    <div className="bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Giao dịch hoàn tất! Đơn hàng đang được chuẩn bị.
                    </div>
                  )}

                  {paymentMethod === 'momo' ? (
                    <div className="text-xs space-y-2 bg-[#d82d8b]/5 p-4 rounded-xl border border-[#d82d8b]/10 mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mã đơn hàng:</span>
                        <span className="font-bold text-gray-800">#PB-{orderSuccessDetails.id}</span>
                      </div>
                      <div className="flex justify-between text-[#d82d8b] font-bold border-t border-dashed border-pink-200 pt-2">
                        <span>Số tiền MoMo:</span>
                        <span>{Number(orderSuccessDetails.total_amount || orderSuccessDetails.total_price || total).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="bg-[#d82d8b]/10 p-2 rounded-lg text-[9px] text-[#d82d8b] leading-relaxed">
                        💡 <strong>MoMo Test Info:</strong> Dành cho MoMo UAT Sandbox testing. Vui lòng bấm nút giả lập để kiểm thử đối soát tự động.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-y-2 border-t border-dashed border-gray-200 pt-3">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="col-span-2 font-bold text-gray-800">VietinBank (Công Thương VN)</span>

                      <span className="text-gray-400">Số tài khoản:</span>
                      <span className="col-span-2 font-bold text-gray-900 text-base">123456789999</span>

                      <span className="text-gray-400">Chủ tài khoản:</span>
                      <span className="col-span-2 font-bold text-gray-800">CLB PICKLEBALL PRO</span>

                      <span className="text-gray-400">Số tiền:</span>
                      <span className="col-span-2 font-extrabold text-blue-600 text-lg">
                        {Number(orderSuccessDetails.total_amount || orderSuccessDetails.total_price || total).toLocaleString('vi-VN')} đ
                      </span>

                      <span className="text-gray-400">Nội dung CK:</span>
                      <span className="col-span-2 font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs w-max">
                        CK PB {orderSuccessDetails.id}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tóm tắt giao nhận hàng */}
            <div className="p-8 space-y-6">
              <div>
                <h4 className="font-extrabold text-gray-900 text-base mb-3 border-b border-gray-100 pb-2">Thông tin nhận hàng</h4>
                <div className="grid grid-cols-3 gap-y-2 text-sm text-gray-600">
                  <span>Họ và tên:</span>
                  <span className="col-span-2 font-semibold text-gray-900">{shippingName}</span>

                  <span>Số điện thoại:</span>
                  <span className="col-span-2 font-semibold text-gray-900">{shippingPhone}</span>

                  <span>Địa chỉ nhận:</span>
                  <span className="col-span-2 font-semibold text-gray-900">
                    {hasPurchase ? shippingAddress : 'Nhận trực tiếp tại quầy lễ tân CLB PickleBall Pro'}
                  </span>

                  <span>Phương thức:</span>
                  <span className={`col-span-2 font-bold ${
                    paymentMethod === 'momo' ? 'text-[#d82d8b]' 
                    : paymentMethod === 'bank' ? 'text-blue-600'
                    : 'text-emerald-700'
                  }`}>
                    {paymentMethod === 'momo' ? 'Ví điện tử MoMo (UAT Sandbox)' : 
                     paymentMethod === 'bank' ? 'Chuyển khoản 24/7 (Simulated VietQR)' : 
                     'Thanh toán tiền mặt khi nhận hàng (COD)'}
                  </span>
                </div>
              </div>

              {/* Lời nhắn / Ghi chú */}
              {shippingNote && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ghi chú từ bạn:</p>
                  <p className="text-sm text-gray-600 italic">"{shippingNote}"</p>
                </div>
              )}

              {/* Nút quay về trang chủ/cửa hàng */}
              <div className="flex justify-center pt-4">
                <a 
                  href="/shop" 
                  className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Tiếp tục mua sắm
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tiêu đề linh hoạt theo Bước */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-blue-600">
            {isCheckoutStep ? 'assignment_turned_in' : 'shopping_cart'}
          </span>
          {isCheckoutStep ? 'Thủ Tục Thanh Toán' : 'Giỏ Hàng Của Bạn'}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* CỘT TRÁI */}
          <div className="w-full lg:w-2/3">
            {!isCheckoutStep ? (
              /* BƯỚC 1: DANH SÁCH GIỎ HÀNG */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {cartItems.length === 0 ? (
                  <div className="p-10 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">remove_shopping_cart</span>
                    <p className="text-gray-500 mb-6">Giỏ hàng của bạn đang trống.</p>
                    <a href="/shop" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors inline-block">
                      Tiếp tục mua sắm
                    </a>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6 group">
                        <div className="w-24 h-24 bg-gray-50 rounded-xl p-2 flex shrink-0 items-center justify-center">
                          <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        </div>
                        
                        <div className="flex-grow text-center sm:text-left w-full sm:w-auto">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                          {item.isRental ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2 justify-center sm:justify-start">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Thuê dụng cụ
                              </span>
                              <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded">
                                Đặt cọc: {Number(item.deposit).toLocaleString('vi-VN')}đ/cái
                              </span>
                            </div>
                          ) : null}
                          <p className="text-blue-600 font-bold mb-4 sm:mb-0">
                            {item.isRental ? 'Phí thuê: ' : ''}{Number(item.price).toLocaleString('vi-VN')}đ
                          </p>
                        </div>

                        <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                            <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 hover:bg-gray-100 text-gray-600 font-bold transition-colors">-</button>
                            <span className="px-4 py-1 font-semibold text-gray-900 border-x border-gray-200">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 hover:bg-gray-100 text-gray-600 font-bold transition-colors">+</button>
                          </div>
                          
                          <p className="font-extrabold text-gray-900 w-28 text-right hidden sm:block">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                          </p>

                          <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* BƯỚC 2: ĐIỀN THÔNG TIN GIAO HÀNG & CHỌN CỔNG THANH TOÁN */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
                
                <form onSubmit={handlePlaceOrder} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-blue-600">contact_mail</span>
                      1. Thông Tin Nhận Hàng &amp; Liên Hệ
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ &amp; Tên Người Nhận</label>
                        <input 
                          type="text" 
                          required
                          value={shippingName}
                          onChange={(e) => setShippingName(e.target.value)}
                          placeholder="Nhập tên người nhận hàng"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số Điện Thoại Liên Hệ</label>
                        <input 
                          type="tel" 
                          required
                          value={shippingPhone}
                          onChange={(e) => setShippingPhone(e.target.value)}
                          placeholder="Số điện thoại nhận hàng"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Chỉ hiển thị chọn phương thức nhận hàng khi có sản phẩm mua đứt */}
                    {hasPurchase ? (
                      <div className="mb-4 mt-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phương thức nhận hàng</label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            deliveryMethod === 'home' 
                              ? 'border-blue-500 bg-blue-50/30 text-blue-700 font-bold ring-1 ring-blue-500' 
                              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'
                          }`}>
                            <input 
                              type="radio" 
                              name="deliveryMethod" 
                              checked={deliveryMethod === 'home'} 
                              onChange={() => setDeliveryMethod('home')} 
                              className="sr-only" 
                            />
                            <span className="material-symbols-outlined text-lg">local_shipping</span>
                            Nhận tại nhà
                          </label>
                          
                          <label className={`border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            deliveryMethod === 'counter' 
                              ? 'border-blue-500 bg-blue-50/30 text-blue-700 font-bold ring-1 ring-blue-500' 
                              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'
                          }`}>
                            <input 
                              type="radio" 
                              name="deliveryMethod" 
                              checked={deliveryMethod === 'counter'} 
                              onChange={() => setDeliveryMethod('counter')} 
                              className="sr-only" 
                            />
                            <span className="material-symbols-outlined text-lg">storefront</span>
                            Nhận tại quầy bán
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Giỏ chỉ có thuê: luôn nhận tại CLB */
                      <div className="mb-4 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
                        <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">storefront</span>
                        <div>
                          <p className="text-sm font-bold text-emerald-800">Nhận dụng cụ thuê tại quầy CLB</p>
                          <p className="text-xs text-emerald-700 mt-0.5">238 Ba Tháng Hai, Quận 10, TP.HCM — vui lòng mang CMND/CCCD khi đến nhận.</p>
                        </div>
                      </div>
                    )}

                    {/* Chỉ hiển thị địa chỉ khi có sản phẩm mua đứt */}
                    {hasPurchase && (
                      <div className="mt-4">
                        {deliveryMethod === 'home' ? (
                          <>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                              Địa Chỉ Nhận Hàng <span className="text-red-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              placeholder="Nhập địa chỉ nhà cụ thể, phường xã, quận huyện"
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                            />
                            
                            <div className="mt-3 bg-blue-50 text-blue-800 px-4 py-3.5 rounded-xl border border-blue-200 text-xs font-medium space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="material-symbols-outlined text-[18px]">info</span>
                                Lưu ý chứng minh khi nhận hàng tại nhà:
                              </div>
                              <p className="pl-6 text-[11px] text-blue-700 leading-relaxed">
                                Quý khách vui lòng xuất trình <strong>CMND/CCCD bản gốc</strong> hoặc <strong>chữ ký xác nhận chính chủ</strong> cho nhân viên giao hàng khi nhận dụng cụ để hoàn tất thủ tục đối chiếu và bàn giao.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-amber-50/60 text-amber-900 px-4 py-3.5 rounded-xl border border-amber-200 text-xs font-medium space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800">
                              <span className="material-symbols-outlined text-[18px]">storefront</span>
                              Nhận hàng trực tiếp tại quầy CLB:
                            </div>
                            <p className="pl-6 text-[11px] text-amber-850 leading-relaxed">
                              - <strong>Địa điểm:</strong> Quầy lễ tân CLB PickleBall Pro (238 Ba Tháng Hai, Quận 10, TP.HCM).
                            </p>
                            <p className="pl-6 text-[11px] text-amber-850 leading-relaxed">
                              - <strong>⚠️ Yêu cầu chứng minh:</strong> Khi đến nhận, quý khách vui lòng <strong>xuất trình CMND/CCCD hoặc tin nhắn/email xác nhận đơn hàng</strong> kèm số điện thoại để đối chiếu thông tin chính xác trước khi nhận dụng cụ.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi Chú Đơn Hàng (Nếu Có)</label>
                      <textarea 
                        rows="2"
                        value={shippingNote}
                        onChange={(e) => setShippingNote(e.target.value)}
                        placeholder="Yêu cầu giao hàng hoặc lưu ý về dụng cụ thuê..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium resize-none"
                      ></textarea>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-blue-600">payments</span>
                      2. Chọn Phương Thức Thanh Toán
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Lựa chọn 1: MoMo UAT Sandbox */}
                      <label 
                        onClick={() => setPaymentMethod('momo')}
                        className={`border rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all shadow-sm relative hover:border-pink-200 ${
                          paymentMethod === 'momo' ? 'border-[#d82d8b] bg-pink-50/20 ring-1 ring-[#d82d8b]' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-3xl text-[#d82d8b] mb-2">qr_code_scanner</span>
                        <span className="font-bold text-sm text-gray-800">Ví Điện Tử MoMo</span>
                        <span className="text-[10px] text-gray-400 mt-1">UAT Test Sandbox</span>
                      </label>

                      {/* Lựa chọn 2: Bank Transfer */}
                      <label 
                        onClick={() => setPaymentMethod('bank')}
                        className={`border rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all shadow-sm relative hover:border-blue-200 ${
                          paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-3xl text-blue-600 mb-2">account_balance</span>
                        <span className="font-bold text-sm text-gray-800">Chuyển Khoản 24/7</span>
                        <span className="text-[10px] text-gray-400 mt-1">Simulated VietQR</span>
                      </label>

                      {/* Lựa chọn 3: COD */}
                      <label 
                        onClick={() => setPaymentMethod('cod')}
                        className={`border rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all shadow-sm relative hover:border-emerald-300 ${
                          paymentMethod === 'cod' 
                            ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-3xl mb-2 ${
                          paymentMethod === 'cod' ? 'text-emerald-600' : 'text-gray-400'
                        }`}>payments</span>
                        <span className={`font-bold text-sm ${
                          paymentMethod === 'cod' ? 'text-emerald-700' : 'text-gray-800'
                        }`}>Thanh Toán Tiền Mặt</span>
                        <span className="text-[10px] text-gray-400 mt-1">Khi nhận hàng (COD)</span>
                      </label>

                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 justify-between items-center border-t border-gray-150">
                    <button 
                      type="button" 
                      onClick={() => setIsCheckoutStep(false)}
                      className="px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Quay lại giỏ hàng
                    </button>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg transition-colors flex items-center gap-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                          Đang tạo đơn hàng...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          Xác Nhận &amp; Đặt Hàng
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            )}
            
            {/* Tiếp tục mua sắm button */}
            {!isCheckoutStep && cartItems.length > 0 && (
              <div className="mt-6 flex justify-between items-center">
                <a href="/shop" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Tiếp tục mua sắm
                </a>
                <button onClick={() => saveCart([])} className="text-red-500 font-medium hover:underline text-sm">
                  Xóa toàn bộ giỏ hàng
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-4 text-sm text-gray-600 mb-6">
                <div className="flex justify-between">
                  <span>Tổng tiền hàng ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} sản phẩm)</span>
                  <span className="font-semibold text-gray-900">{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                
                {totalDeposit > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Tổng tiền đặt cọc
                    </span>
                    <span className="font-extrabold">{totalDeposit.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryMethod === 'counter' ? (
                      <strong className="text-green-600 font-bold">Miễn phí (Nhận tại quầy)</strong>
                    ) : (
                      shipping === 0 ? <strong className="text-green-600 font-bold">Miễn phí</strong> : `${shipping.toLocaleString('vi-VN')}đ`
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-6 flex justify-between items-end">
                <span className="text-gray-900 font-bold">Tổng thanh toán</span>
                <span className="text-2xl font-black text-blue-600">{total.toLocaleString('vi-VN')}đ</span>
              </div>

              {!isCheckoutStep && (
                <button 
                  onClick={handleProceedToCheckout}
                  disabled={cartItems.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                    cartItems.length === 0 ? 'bg-gray-300 cursor-not-allowed animate-none' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
                  }`}
                >
                  <span className="material-symbols-outlined">payments</span>
                  Tiến Hành Thanh Toán
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Thanh toán an toàn &amp; bảo mật 100%
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
