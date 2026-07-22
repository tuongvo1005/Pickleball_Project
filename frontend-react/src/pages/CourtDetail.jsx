import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosClient from '../axiosClient';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const CourtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toast = useToast();

  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Booking States
  const getTodayString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const [bookingDate, setBookingDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(1.5); // mặc định 1.5 giờ
  const [bookingLoading, setBookingLoading] = useState(false);

  // Online Payment States
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(300);
  const [onlinePaymentStep, setOnlinePaymentStep] = useState('waiting'); // waiting, processing, success
  const [activePaymentMethod, setActivePaymentMethod] = useState('momo'); // momo, vietqr

  // Mock Reviews
  const reviews = [
    { id: 1, name: 'Nguyễn Văn A', rating: 5, comment: 'Sân mới, thảm đẹp, ánh sáng tốt vào buổi tối. Nhân viên phục vụ rất nhiệt tình!', date: '15/05/2026' },
    { id: 2, name: 'Trần Thị B', rating: 4.5, comment: 'Sân ngoài trời hơi nóng vào buổi trưa nhưng không gian rất thoáng đãng. Giá cả hợp lý.', date: '12/05/2026' },
    { id: 3, name: 'Lê Hoàng C', rating: 5, comment: 'Chất lượng sân tuyệt vời, bãi đậu xe rộng rãi. Sẽ tiếp tục đặt sân ở đây lâu dài!', date: '08/05/2026' },
  ];

  // List of Court Utilities
  const utilities = [
    { icon: 'wifi', label: 'Wifi miễn phí' },
    { icon: 'local_parking', label: 'Bãi đỗ xe rộng' },
    { icon: 'water_drop', label: 'Nước uống miễn phí' },
    { icon: 'wc', label: 'Phòng thay đồ/WC sạch' },
    { icon: 'lightbulb', label: 'Hệ thống đèn LED hiện đại' },
    { icon: 'shower', label: 'Phòng tắm nóng lạnh' },
  ];

  // Khung giờ bắt đầu khả dụng
  const getStartTimes = () => {
    const rawSlots = court && court.slots && court.slots.length > 0 
      ? court.slots 
      : ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];
    return rawSlots.map(time => ({ time, status: 'Trống' }));
  };

  // Các lựa chọn thời lượng chơi
  const durations = [
    { value: 1.0, label: '1.0 giờ' },
    { value: 1.5, label: '1.5 giờ (1h30p)' },
    { value: 2.0, label: '2.0 giờ' },
    { value: 2.5, label: '2.5 giờ (2h30p)' },
    { value: 3.0, label: '3.0 giờ' },
    { value: 4.0, label: '4.0 giờ' },
  ];

  // Tính giờ kết thúc
  const calculateEndTime = (startStr, durationHours) => {
    if (!startStr) return '';
    const [hours, minutes] = startStr.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + durationHours * 60;
    
    let endHours = Math.floor(totalMinutes / 60) % 24;
    let endMinutes = totalMinutes % 60;
    
    const formattedHours = endHours.toString().padStart(2, '0');
    const formattedMinutes = endMinutes.toString().padStart(2, '0');
    
    return `${formattedHours}:${formattedMinutes}`;
  };

  const [existingBookings, setExistingBookings] = useState([]);

  // Hàm xác định trạng thái trống/bận của một khung giờ dựa trên ngày đã chọn
  const getSlotStatus = (timeStr) => {
    if (!bookingDate) return 'Trống';
    
    // Kiểm tra giờ đã qua nếu chọn ngày hôm nay
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    if (bookingDate === todayStr) {
      const currentHours = today.getHours();
      const currentMinutes = today.getMinutes();
      const [slotHours, slotMinutes] = timeStr.split(':').map(Number);
      
      if (currentHours > slotHours || (currentHours === slotHours && currentMinutes >= slotMinutes)) {
        return 'Đã qua';
      }
    }
    
    const isBooked = existingBookings.some(b => {
      if (b.booking_date !== bookingDate) return false;
      
      const [bHoursStart, bMinsStart] = b.start_time.split(':').map(Number);
      const [bHoursEnd, bMinsEnd] = b.end_time.split(':').map(Number);
      const [sHours, sMins] = timeStr.split(':').map(Number);
      
      const bStart = bHoursStart * 60 + bMinsStart;
      const bEnd = bHoursEnd * 60 + bMinsEnd;
      const slotTime = sHours * 60 + sMins;
      
      return slotTime >= bStart && slotTime < bEnd;
    });
    
    return isBooked ? 'Đã đặt' : 'Trống';
  };

  const fetchCourtBookings = () => {
    axiosClient.get('/bookings')
      .then(response => {
        const allBookings = response.data.data || [];
        const courtBookings = allBookings.filter(b => 
          b.court_id?.toString() === id.toString() && 
          (b.payment_status === 'paid' || b.payment_status === 'pending')
        );
        setExistingBookings(courtBookings);
      })
      .catch(err => {
        console.error("Lỗi tải thông tin đặt sân trùng:", err);
      });
  };

  useEffect(() => {
    // Lấy thông tin chi tiết sân từ Laravel API
    axios.get(`http://127.0.0.1:8000/api/courts`)
      .then(response => {
        const list = response.data.data || [];
        // Tìm sân có id tương ứng
        const found = list.find(item => item.id.toString() === id.toString());
        if (found) {
          setCourt(found);
          const rawSlots = found.slots && found.slots.length > 0 
            ? found.slots 
            : ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];
          setStartTime(rawSlots[0] || '');
        } else {
          setError("Không tìm thấy thông tin sân.");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi tải chi tiết sân:", err);
        setError("Không thể tải thông tin sân lúc này.");
        setLoading(false);
      });

    fetchCourtBookings();
  }, [id]);

  // Auto-verify payment effect
  useEffect(() => {
    let timer;

    if (isPayingOnline && createdBooking && onlinePaymentStep === 'waiting') {
      timer = setInterval(() => {
        setPaymentTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isPayingOnline, createdBooking, onlinePaymentStep]);

  const handleSimulatePaymentSuccess = () => {
    if (!createdBooking) return;
    setOnlinePaymentStep('processing');
    
    axiosClient.put(`/bookings/${createdBooking.id}`, {
      payment_status: 'paid'
    })
    .then(() => {
      setOnlinePaymentStep('success');
      toast.success(`Đã nhận cọc 50%! Đặt sân #${createdBooking.id} đã hoàn tất thanh toán cọc.`);
      fetchCourtBookings(); // Tải lại lịch
    })
    .catch(err => {
      console.error("Lỗi cập nhật trạng thái thanh toán cọc:", err);
      setOnlinePaymentStep('waiting');
      toast.error("Không thể xác thực giao dịch cọc trực tuyến.");
    });
  };

  const handleBookCourt = (e) => {
    e.preventDefault();
    if (!user) {
      toast.warning('Vui lòng đăng nhập để đặt sân!');
      navigate('/login');
      return;
    }

    if (!bookingDate) {
      toast.warning('Vui lòng chọn ngày đặt sân!');
      return;
    }

    if (!startTime) {
      toast.warning('Vui lòng chọn giờ bắt đầu chơi!');
      return;
    }

    if (getSlotStatus(startTime) === 'Đã đặt') {
      toast.error('Khung giờ bạn chọn đã bị trùng lịch! Vui lòng chọn giờ bắt đầu khác.');
      return;
    }

    setBookingLoading(true);

    const endTime = calculateEndTime(startTime, duration);
    const totalPrice = Number(court.price_per_hour) * duration;

    axiosClient.post('/bookings', {
      user_id: user.id,
      court_id: court.id,
      coach_id: null,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      payment_status: 'pending'
    })
    .then(response => {
      const booking = response.data.data;
      setCreatedBooking(booking);
      setIsPayingOnline(true);
      setOnlinePaymentStep('waiting');
      setPaymentTimeLeft(300);
      setBookingLoading(false);
    })
    .catch(err => {
      console.error("Lỗi khi gửi yêu cầu đặt sân:", err);
      const errMsg = err.response?.data?.message || "Không thể kết nối đến hệ thống đặt sân.";
      toast.error(`Đặt sân không thành công: ${errMsg}`);
      setBookingLoading(false);
    });
  };

  const getProductImage = (name = '') => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('sala')) return "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=2070&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?q=80&w=2070&auto=format&fit=crop";
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 bg-gray-50">
        <span className="material-symbols-outlined animate-spin text-5xl text-green-600 mb-4">sync</span>
        <span className="text-gray-500 font-medium text-lg">Đang tải thông tin chi tiết sân...</span>
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">sentiment_dissatisfied</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã có lỗi xảy ra!</h2>
        <p className="text-gray-500 mb-6">{error || 'Không tìm thấy sân này.'}</p>
        <button onClick={() => navigate('/courts')} className="bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition">
          Quay lại Tìm Sân
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Premium Cover Banner */}
      <div className="relative h-[400px] w-full bg-gray-900 overflow-hidden">
        <img 
          src={getProductImage(court.name)} 
          alt={court.name}
          className="w-full h-full object-cover opacity-60 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
        <div className="absolute bottom-10 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
              court.type === 'trong-nha' || court.type === 'indoor' ? 'bg-green-600 text-white' : 'bg-white text-gray-900'
            }`}>
              {court.type === 'trong-nha' || court.type === 'indoor' ? 'Sân Trong Nhà' : 'Sân Ngoài Trời'}
            </span>
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1 border border-white/20">
              <span className="material-symbols-outlined text-yellow-400 text-sm" style={{fontVariationSettings: '"FILL" 1'}}>star</span>
              <span className="text-xs font-bold">4.8 (85 đánh giá)</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">{court.name}</h1>
          <p className="flex items-center gap-1 text-gray-300 text-sm md:text-base font-light">
            <span className="material-symbols-outlined text-[20px] text-green-400">location_on</span>
            Khu vực Hồ Chí Minh, Việt Nam (Bản đồ chi tiết bên dưới)
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột Trái: Chi tiết & Tiện ích & Đánh giá */}
          <div className="lg:col-span-2 space-y-8">
            {/* Giới thiệu & Mô tả */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">info</span>
                Giới thiệu sân
              </h2>
              <p className="text-gray-600 leading-relaxed font-light mb-6">
                Chào mừng bạn đến với {court.name}! Đây là một trong những cụm sân Pickleball tiêu chuẩn quốc tế hàng đầu khu vực. Mặt thảm sân được sơn phủ công nghệ Acrylic giảm chấn chất lượng cao, giúp tăng độ đàn hồi, chống trơn trượt tối đa và bảo vệ đầu gối người chơi. Hệ thống chiếu sáng hiện đại bảo vệ mắt người chơi, không đổ bóng, đảm bảo trải nghiệm chơi tuyệt vời cả ban ngày lẫn ban đêm.
              </p>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Thông số chi tiết:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">sports_tennis</span>
                  <span>Kích thước chuẩn quốc tế</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">grid_view</span>
                  <span>Loại sân: Acrylic 5 lớp</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">schedule</span>
                  <span>Mở cửa: 06:00 - 22:00</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">verified_user</span>
                  <span>An ninh 24/7 có camera</span>
                </div>
              </div>
            </div>

            {/* Dịch vụ & Tiện ích đi kèm */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">reviews</span>
                Dịch vụ & Tiện ích đi kèm
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {utilities.map((util, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-2xl border border-green-100/30">
                    <span className="material-symbols-outlined text-green-600 text-2xl">{util.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{util.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Đánh giá khách hàng */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">stars</span>
                Đánh giá từ cộng đồng
              </h2>
              
              <div className="space-y-6">
                {reviews.map(rev => (
                  <div key={rev.id} className="pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{rev.name}</h4>
                        <span className="text-xs text-gray-400">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-200">
                        <span className="material-symbols-outlined text-yellow-500 text-sm" style={{fontVariationSettings: '"FILL" 1'}}>star</span>
                        <span className="text-xs font-bold text-yellow-700">{rev.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-light">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột Phải: Bảng tính tiền & Form đặt sân */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl sticky top-24">
              {isPayingOnline && createdBooking ? (
                <div className="space-y-6">
                  {/* Tab selector */}
                  <div className="flex border-b border-gray-150">
                    <button 
                      type="button"
                      onClick={() => setActivePaymentMethod('momo')} 
                      className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer border-0 bg-transparent ${
                        activePaymentMethod === 'momo' 
                          ? 'border-[#d82d8b] text-[#d82d8b] font-black' 
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
                      Ví MoMo UAT
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActivePaymentMethod('vietqr')} 
                      className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer border-0 bg-transparent ${
                        activePaymentMethod === 'vietqr' 
                          ? 'border-emerald-500 text-emerald-600 font-black' 
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">account_balance</span>
                      VietQR CK
                    </button>
                  </div>

                  {activePaymentMethod === 'momo' ? (
                    <div className="space-y-6">
                      <div className="text-center bg-pink-50 text-pink-850 p-4 rounded-2xl border border-pink-100 flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="bg-[#d82d8b] text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">UAT Sandbox</span>
                        </div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#d82d8b]">Ví Điện Tử MoMo</h4>
                        <p className="text-[9px] text-pink-700 mt-0.5">Quét mã QR bằng ứng dụng MoMo Developer Sandbox</p>
                      </div>

                      <div className="flex flex-col items-center justify-center relative">
                        <div className="bg-white p-3 rounded-2xl border-2 border-[#d82d8b]/20 shadow-lg relative w-max mx-auto">
                          {onlinePaymentStep === 'success' && (
                            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-3 text-center">
                              <span className="material-symbols-outlined text-5xl text-pink-600 animate-bounce mb-1">verified</span>
                              <span className="text-pink-650 font-extrabold text-[11px] uppercase tracking-wider">MoMo Thành Công!</span>
                              <span className="text-gray-400 text-[9px] mt-0.5">Đặt sân thành công!</span>
                            </div>
                          )}

                          {onlinePaymentStep === 'processing' ? (
                            <div className="w-[150px] h-[150px] flex flex-col items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-3xl text-[#d82d8b] animate-spin">sync</span>
                              <span className="text-[10px] text-gray-500 font-bold">Đang kiểm tra MoMo UAT...</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=momo://payment?amount=${createdBooking.total_price*0.5}&orderId=PB-${createdBooking.id}`} 
                                alt="MoMo UAT Deposit"
                                className="w-[150px] h-[150px] object-contain rounded-lg" 
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none">
                                <div className="w-8 h-8 bg-[#d82d8b] rounded-lg flex items-center justify-center shadow-md">
                                  <span className="text-white font-black text-[9px]">momo</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">Quét QR hoặc dùng TK MoMo Sandbox</span>
                      </div>

                      <div className="text-[11px] space-y-2 bg-[#d82d8b]/5 p-3.5 rounded-xl border border-[#d82d8b]/10">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Mã đơn hàng:</span>
                          <span className="font-bold text-gray-800">#PB-{createdBooking.id}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-pink-200/50 pt-2 text-[#d82d8b] font-bold">
                          <span>Số tiền cọc MoMo:</span>
                          <span>{(createdBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="bg-[#d82d8b]/10 p-2 rounded-lg text-[8px] text-[#d82d8b] leading-relaxed">
                          💡 <strong>MoMo Test Info:</strong> Dành cho MoMo UAT Sandbox testing. Đối soát tự động sẽ hoàn tất sau vài giây.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl mb-1 text-emerald-600">account_balance</span>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-700">VietQR Chuyển Khoản</h4>
                        <p className="text-[9px] text-emerald-600 mt-0.5">Quét mã QR để chuyển khoản giữ sân</p>
                      </div>

                      <div className="flex flex-col items-center justify-center relative">
                        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-md relative w-max mx-auto">
                          {onlinePaymentStep === 'success' && (
                            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-3 text-center">
                              <span className="material-symbols-outlined text-5xl text-emerald-500 animate-pulse mb-1">verified</span>
                              <span className="text-emerald-700 font-extrabold text-xs uppercase tracking-wider">Đã Cọc 50%</span>
                              <span className="text-gray-400 text-[9px] mt-0.5">Đặt sân thành công!</span>
                            </div>
                          )}

                          {onlinePaymentStep === 'processing' ? (
                            <div className="w-[150px] h-[150px] flex flex-col items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-3xl text-blue-600 animate-spin">sync</span>
                              <span className="text-[10px] text-gray-500 font-bold">Đang kiểm tra...</span>
                            </div>
                          ) : (
                            <img 
                              src={`https://api.vietqr.io/image/970415-123456789999-vietqr_net.jpg?accountName=CLB%20PICKLEBALL%20PRO&amount=${createdBooking.total_price * 0.5}&addInfo=CK%20PB%20COC%20${createdBooking.id}`} 
                              alt="VietQR Court Deposit"
                              className="w-[150px] h-[150px] object-contain mix-blend-multiply" 
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">Quét VietQR qua app ngân hàng</span>
                      </div>

                      <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-gray-150">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Mã đặt sân:</span>
                          <span className="font-bold text-gray-800">#PB-{createdBooking.id}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-emerald-600 font-bold">
                          <span>Tiền đặt cọc (50%):</span>
                          <span>{(createdBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>Nội dung CK:</span>
                          <span className="font-black text-gray-700 bg-gray-250 px-1.5 py-0.5 rounded">CK PB COC {createdBooking.id}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {onlinePaymentStep === 'waiting' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-2 rounded-xl border border-amber-200 text-[11px] font-semibold">
                        <span className="material-symbols-outlined animate-spin text-[14px]">hourglass_empty</span>
                        Đang đợi giao dịch... ({Math.floor(paymentTimeLeft / 60)}:{String(paymentTimeLeft % 60).padStart(2, '0')})
                      </div>

                      <button 
                        type="button"
                        onClick={handleSimulatePaymentSuccess}
                        className={`w-full text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer border-0 text-[11px] ${
                          activePaymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">bolt</span>
                        Xác nhận đã thanh toán cọc (Test)
                      </button>
                    </div>
                  )}

                  {onlinePaymentStep === 'success' ? (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsPayingOnline(false);
                        setCreatedBooking(null);
                        setStartTime('');
                        setBookingDate(getTodayString());
                        setActivePaymentMethod('momo');
                      }}
                      className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer border-0 text-xs ${
                        activePaymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Xong &amp; Quay lại
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsPayingOnline(false);
                        setCreatedBooking(null);
                        setActivePaymentMethod('momo');
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer border-0 text-xs"
                    >
                      Hủy &amp; Quay lại
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">GIÁ MỖI GIỜ</span>
                    <span className="text-2xl font-black text-green-600">
                      {Number(court.price_per_hour).toLocaleString('vi-VN')}đ
                      <span className="text-xs text-gray-400 font-normal"> /giờ</span>
                    </span>
                  </div>

                  <form onSubmit={handleBookCourt} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">1. Chọn Ngày chơi</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">calendar_today</span>
                        <input 
                          type="date" 
                          value={bookingDate}
                          min={getTodayString()}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">2. Giờ bắt đầu chơi</label>
                      <div className="grid grid-cols-3 gap-2">
                        {getStartTimes().map(slot => {
                          const dynamicStatus = getSlotStatus(slot.time);
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={dynamicStatus === 'Đã đặt' || dynamicStatus === 'Đã qua'}
                              onClick={() => setStartTime(slot.time)}
                              className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                                dynamicStatus === 'Đã đặt' 
                                  ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed line-through'
                                  : dynamicStatus === 'Đã qua'
                                    ? 'bg-gray-150 border-gray-200 text-gray-300 cursor-not-allowed line-through'
                                    : startTime === slot.time
                                      ? 'bg-green-600 border-green-600 text-white shadow-md'
                                      : 'bg-white border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-600'
                              }`}
                            >
                              {slot.time}
                              <span className="block text-[8px] font-medium opacity-85">{dynamicStatus}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">3. Thời lượng chơi</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">schedule</span>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-green-500 bg-white text-gray-700 transition-colors appearance-none"
                        >
                          {durations.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Thời lượng:</span>
                        <span>{duration} giờ</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Khung giờ:</span>
                        <span>
                          {startTime ? `${startTime} - ${calculateEndTime(startTime, duration)}` : 'Chưa chọn'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Giá sân:</span>
                        <span>{Number(court.price_per_hour).toLocaleString('vi-VN')}đ/h</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-dashed border-gray-200 pt-2">
                        <span className="text-gray-500">Tổng tạm tính:</span>
                        <span className="font-bold text-gray-900">{(Number(court.price_per_hour) * duration).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-200 pt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-emerald-700 text-sm font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Cọc trước 50%:
                        </span>
                        <span className="font-black text-emerald-600 text-lg">
                          {((Number(court.price_per_hour) * duration) * 0.5).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 italic text-center mt-1">
                        * Bạn chỉ cần thanh toán trước 50% tiền cọc để giữ sân thành công!
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer border-0"
                    >
                      {bookingLoading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">sync</span>
                          Đang gửi yêu cầu...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">payments</span>
                          Xác nhận Đặt sân ngay
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">security</span>
                      Cam kết bảo mật & Hỗ trợ hoàn trả trước 24h
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CourtDetail;
