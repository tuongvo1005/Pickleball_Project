import { useState, useEffect } from 'react';
import axios from 'axios';
import axiosClient from '../axiosClient';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const CourtGrid = ({ searchTerm = '', selectedTimeSlot = 'Tất cả các giờ', selectedDate = '' }) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toast = useToast();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allBookings, setAllBookings] = useState([]); // Real-time bookings from DB
  
  const getTodayString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchAllBookings = () => {
    axiosClient.get('/bookings')
      .then(res => {
        setAllBookings(res.data.data || []);
      })
      .catch(err => console.error("Lỗi tải tất cả bookings:", err));
  };

  // State cho tính năng Modal Đặt Sân
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [modalDate, setModalDate] = useState(getTodayString());
  const [modalStartTime, setModalStartTime] = useState('08:00');
  const [modalDuration, setModalDuration] = useState(1.5);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);

  // Online Payment States
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(600);
  const [onlinePaymentStep, setOnlinePaymentStep] = useState('waiting'); // waiting, processing, success
  const [activePaymentMethod, setActivePaymentMethod] = useState('momo'); // momo, vietqr

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

  // Kiểm tra xem khung giờ chọn có trùng lịch trong DB không
  const isDurationAllowedForSlot = (timeStr, dur) => {
    if (!timeStr || !modalDate) return true;
    
    const [startHours, startMinutes] = timeStr.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = startTotalMinutes + dur * 60;
    
    return !existingBookings.some(b => {
      if (b.booking_date !== modalDate) return false;
      
      const [bHoursStart, bMinsStart] = b.start_time.split(':').map(Number);
      const [bHoursEnd, bMinsEnd] = b.end_time.split(':').map(Number);
      const bStart = bHoursStart * 60 + bMinsStart;
      const bEnd = bHoursEnd * 60 + bMinsEnd;
      
      return startTotalMinutes < bEnd && endTotalMinutes > bStart;
    });
  };

  const isTimeSlotBooked = (timeStr) => {
    return !isDurationAllowedForSlot(timeStr, 1.0);
  };

  const isSlotDisabled = (timeStr) => {
    if (!modalDate) return true;
    
    // 1. Kiểm tra ngày cũ
    const todayStr = getTodayString();
    if (modalDate < todayStr) return true;
    
    // 2. Kiểm tra giờ đã qua nếu chọn ngày hôm nay
    if (modalDate === todayStr) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const [slotHours, slotMinutes] = timeStr.split(':').map(Number);
      
      if (currentHours > slotHours || (currentHours === slotHours && currentMinutes >= slotMinutes)) {
        return true;
      }
    }
    
    // 3. Kiểm tra xem đã trùng lịch chưa
    return isTimeSlotBooked(timeStr);
  };

  // Tự động chọn khung giờ hợp lệ đầu tiên khi đổi ngày đặt sân hoặc tải lịch đặt mới
  useEffect(() => {
    if (!selectedCourt) return;
    const slots = ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];
    const todayStr = getTodayString();
    
    if (modalDate === todayStr) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      let found = false;
      for (const t of slots) {
        const [slotHours, slotMinutes] = t.split(':').map(Number);
        const isPast = currentHours > slotHours || (currentHours === slotHours && currentMinutes >= slotMinutes);
        if (!isPast && !isTimeSlotBooked(t)) {
          setModalStartTime(t);
          found = true;
          break;
        }
      }
      if (!found) {
        setModalStartTime(''); // Không còn khung giờ nào hôm nay
      }
    } else {
      let found = false;
      for (const t of slots) {
        if (!isTimeSlotBooked(t)) {
          setModalStartTime(t);
          found = true;
          break;
        }
      }
      if (!found) setModalStartTime('08:00');
    }
  }, [modalDate, existingBookings, selectedCourt]);

  const isDurationAllowed = (dur) => {
    return isDurationAllowedForSlot(modalStartTime, dur);
  };

  // Đảm bảo thời lượng chọn luôn hợp lệ khi thay đổi giờ bắt đầu
  useEffect(() => {
    if (!modalStartTime) return;
    
    if (!isDurationAllowed(modalDuration)) {
      const standardDurations = [4.0, 3.0, 2.5, 2.0, 1.5, 1.0];
      const validDuration = standardDurations.find(dur => isDurationAllowed(dur));
      if (validDuration) {
        setModalDuration(validDuration);
      } else {
        setModalDuration(1.0); // fallback
      }
    }
  }, [modalStartTime, existingBookings, modalDate]);

  // Tải danh sách đơn đặt của sân đang mở Modal để tránh trùng lịch
  const fetchCourtBookings = () => {
    if (!selectedCourt) {
      setExistingBookings([]);
      return;
    }
    axiosClient.get('/bookings')
      .then(response => {
        const allBookings = response.data.data || [];
        const now = new Date();
        const courtBookings = allBookings.filter(b => {
          if (b.court_id?.toString() !== selectedCourt.id.toString()) return false;
          if (b.status === 'cancelled' || b.payment_status === 'failed') return false;
          if (b.payment_status === 'paid') return true;
          if (b.payment_status === 'pending') {
            const createdAt = new Date(b.created_at || b.updated_at);
            const diffMinutes = (now - createdAt) / (1000 * 60);
            return diffMinutes < 10;
          }
          return false;
        });
        setExistingBookings(courtBookings);
      })
      .catch(err => {
        console.error("Lỗi tải lịch đặt sân trùng ở trang chủ:", err);
      });
  };

  useEffect(() => {
    fetchCourtBookings();
  }, [selectedCourt]);

  useEffect(() => {
    // Gọi API Laravel để lấy danh sách Sân
    axios.get('http://127.0.0.1:8000/api/courts')
      .then(response => {
        setCourts(response.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi lấy dữ liệu sân:", err);
        setError("Không thể tải danh sách sân lúc này.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAllBookings();
  }, [selectedDate]);

  const handleBookingClick = (court) => {
    if (court.status === 'maintenance') {
      toast.warning('Sân này đang trong thời gian bảo trì, quý khách không thể truy cập hoặc đặt lịch!');
      return;
    }
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!user || !user.id || !token) {
      toast.warning('Vui lòng đăng nhập để thực hiện tính năng đặt sân!');
      navigate('/login');
      return;
    }
    setSelectedCourt(court);
    const courtSlots = court.slots && court.slots.length > 0 ? court.slots : ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];
    setModalStartTime(courtSlots[0] || '08:00');
  };

  const handleCloseModal = () => {
    if (isPayingOnline && createdBooking && onlinePaymentStep === 'waiting') {
      axiosClient.put(`/bookings/${createdBooking.id}`, {
        status: 'cancelled',
        payment_status: 'failed'
      })
      .then(() => {
        toast.info("Đã hủy quá trình đặt cọc và giải phóng ca chơi.");
        fetchAllBookings();
      })
      .catch(err => console.error("Lỗi giải phóng ca tạm giữ:", err));
    }
    setSelectedCourt(null);
    setModalDate(getTodayString());
    setModalStartTime('08:00');
    setModalDuration(1.5);
    setIsPayingOnline(false);
    setCreatedBooking(null);
    setOnlinePaymentStep('waiting');
    setPaymentTimeLeft(600);
    setActivePaymentMethod('momo');
  };

  // Auto-verify payment effect
  useEffect(() => {
    let timer;

    if (isPayingOnline && createdBooking && onlinePaymentStep === 'waiting') {
      timer = setInterval(() => {
        setPaymentTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            toast.error("Thời gian tạm giữ chỗ (10 phút) đã hết! Ca chơi đã được giải phóng cho người khác.");
            setIsPayingOnline(false);
            setCreatedBooking(null);
            fetchCourtBookings();
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
      
      fetchAllBookings();
      
      // Tải lại danh sách lịch đặt sân trùng của sân hiện tại
      if (selectedCourt) {
        axiosClient.get('/bookings')
          .then(res => setExistingBookings((res.data.data || []).filter(b => b.court_id?.toString() === selectedCourt.id?.toString() && (b.payment_status === 'paid' || b.payment_status === 'pending'))));
      }
    })
    .catch(err => {
      console.error("Lỗi cập nhật trạng thái thanh toán cọc:", err);
      setOnlinePaymentStep('waiting');
      toast.error("Không thể xác thực giao dịch cọc trực tuyến.");
    });
  };

  const confirmBooking = () => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!user || !user.id || !token) {
      toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      navigate('/login');
      return;
    }

    if (!modalDate) {
      toast.warning('Vui lòng chọn ngày đặt sân!');
      return;
    }

    if (modalDate < getTodayString()) {
      toast.error('Không thể đặt sân cho ngày trong quá khứ!');
      return;
    }

    if (isSlotDisabled(modalStartTime)) {
      toast.error('Khung giờ này đang được tạm giữ hoặc đã có khách đặt! Vui lòng chọn giờ bắt đầu khác.');
      return;
    }

    if (!isDurationAllowed(modalDuration)) {
      toast.error('Thời lượng chơi đã chọn trùng lịch đặt của người khác! Vui lòng rút ngắn thời lượng chơi.');
      return;
    }

    setBookingLoading(true);

    const end = calculateEndTime(modalStartTime, modalDuration);
    const totalPrice = Number(selectedCourt.price_per_hour) * modalDuration;

    axiosClient.post('/bookings', {
      user_id: user.id,
      court_id: selectedCourt.id,
      coach_id: null,
      booking_date: modalDate,
      start_time: modalStartTime,
      end_time: end,
      total_price: totalPrice,
      payment_status: 'pending'
    })
    .then(response => {
      const booking = response.data.data;
      setCreatedBooking(booking);
      setIsPayingOnline(true);
      setOnlinePaymentStep('waiting');
      setPaymentTimeLeft(600); // 10 phút tạm giữ
      setBookingLoading(false);
      fetchAllBookings();
    })
    .catch(err => {
      console.error("Lỗi đặt sân từ trang chủ:", err);
      const errMsg = err.response?.data?.message || "Không thể kết nối đến hệ thống đặt sân.";
      toast.error(`Đặt sân không thành công: ${errMsg}`);
      setBookingLoading(false);
    });
  };

  const getCourtLocation = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('kỳ hòa')) return 'Cao Thắng, Quận 10, TP. Hồ Chí Minh';
    if (lower.includes('sala')) return 'Mai Chí Thọ, Quận 2, TP. Thủ Đức';
    if (lower.includes('quận 7') || lower.includes('q7')) return 'Huỳnh Tấn Phát, Quận 7, TP. Hồ Chí Minh';
    if (lower.includes('quận 1') || lower.includes('q1')) return 'Nguyễn Du, Quận 1, TP. Hồ Chí Minh';
    if (lower.includes('bình thạnh')) return 'Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh';
    if (lower.includes('tân bình')) return 'Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh';
    return 'Trần Não, Quận 2, TP. Hồ Chí Minh';
  };

  // Hàm trả về trạng thái khung giờ khả dụng cho sân (phục vụ bộ lọc)
  const getCourtTimeSlots = (courtId) => {
    const todayStr = getTodayString();
    const targetDate = selectedDate || todayStr;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const slots = [
      { time: '06:00 - 07:30', start: '06:00', end: '07:30', period: 'Sáng' },
      { time: '08:00 - 09:30', start: '08:00', end: '09:30', period: 'Sáng' },
      { time: '10:00 - 11:30', start: '10:00', end: '11:30', period: 'Sáng' },
      { time: '13:00 - 14:30', start: '13:00', end: '14:30', period: 'Chiều' },
      { time: '15:00 - 16:30', start: '15:00', end: '16:30', period: 'Chiều' },
      { time: '17:00 - 18:30', start: '17:00', end: '18:30', period: 'Chiều' },
      { time: '19:00 - 20:30', start: '19:00', end: '20:30', period: 'Tối' },
      { time: '21:00 - 22:30', start: '21:00', end: '22:30', period: 'Tối' },
    ];

    // Lọc bookings của sân này trong ngày mục tiêu
    const courtBookingsOnDate = allBookings.filter(b => 
      b.court_id?.toString() === courtId.toString() && 
      b.booking_date === targetDate &&
      b.status !== 'cancelled' &&
      b.payment_status !== 'failed'
    );

    return slots.map(slot => {
      const [slotStartH, slotStartM] = slot.start.split(':').map(Number);
      const [slotEndH, slotEndM] = slot.end.split(':').map(Number);
      const slotStartMin = slotStartH * 60 + slotStartM;
      const slotEndMin = slotEndH * 60 + slotEndM;

      // Kiểm tra giờ đã trôi qua nếu chọn ngày hôm nay
      let isPast = false;
      if (targetDate < todayStr) {
        isPast = true;
      } else if (targetDate === todayStr) {
        if (currentHours > slotStartH || (currentHours === slotStartH && currentMinutes >= slotStartM)) {
          isPast = true;
        }
      }

      const isBooked = courtBookingsOnDate.some(b => {
        const [bStartH, bStartM] = b.start_time.split(':').map(Number);
        const [bEndH, bEndM] = b.end_time.split(':').map(Number);
        const bStartMin = bStartH * 60 + bStartM;
        const bEndMin = bEndH * 60 + bEndM;
        
        return slotStartMin < bEndMin && slotEndMin > bStartMin;
      });

      return {
        time: slot.time,
        period: slot.period,
        isPast: isPast,
        status: isPast ? 'Đã qua' : (isBooked ? 'Đã đặt' : 'Trống')
      };
    });
  };

  const getFilteredCourts = () => {
    return courts.filter((court, index) => {
      // 1. Lọc theo tên sân / địa điểm / ID / Số thứ tự "Sân số X" / Loại sân
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.trim().toLowerCase();
        
        // Match trực tiếp tên sân hoặc vị trí
        const nameMatch = court.name.toLowerCase().includes(term);
        const locationMatch = getCourtLocation(court.name).toLowerCase().includes(term);
        const idMatch = court.id.toString() === term;

        // Match số thứ tự "Sân 1", "Sân số 1", "Sân 2", "Sân số 2"...
        const digitMatch = term.match(/\d+/);
        const num = digitMatch ? digitMatch[0] : null;
        const courtNumMatch = num ? (court.id.toString() === num || (index + 1).toString() === num) : false;

        // Match theo loại sân ("Trong nhà", "Ngoài trời")
        const isOutdoorTerm = term.includes('ngoại') || term.includes('outdoor');
        const isIndoorTerm = term.includes('trong') || term.includes('indoor');
        const typeMatch = (isOutdoorTerm && (court.type === 'outdoor' || court.type === 'ngoai-troi')) ||
                          (isIndoorTerm && (court.type === 'indoor' || court.type === 'trong-nha'));

        const textMatch = nameMatch || locationMatch || idMatch || courtNumMatch || typeMatch;

        if (!textMatch) return false;
      }

      // 2. Lọc theo khung giờ trống khả dụng (Phải chưa qua giờ và chưa bị ai đặt)
      const slots = getCourtTimeSlots(court.id);
      
      if (!selectedTimeSlot || selectedTimeSlot === 'Tất cả các giờ') {
        return true;
      }

      const periodMap = {
        'Sáng (6h - 12h)': 'Sáng',
        'Chiều (12h - 18h)': 'Chiều',
        'Tối (18h - 22h)': 'Tối'
      };

      const targetPeriod = periodMap[selectedTimeSlot];
      if (!targetPeriod) return true;

      // Một sân được coi là khả dụng nếu nó có ít nhất một khung giờ TRỐNG và CHƯA QUA GIỜ
      return slots.some(slot => slot.period === targetPeriod && slot.status === 'Trống');
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="material-symbols-outlined animate-spin text-4xl text-green-600">autorenew</span>
        <span className="ml-3 text-lg text-gray-500 font-medium">Đang tải dữ liệu sân...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-6xl text-red-300 block mb-4">error</span>
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    );
  }

  const activeFilteredCourts = getFilteredCourts();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {searchTerm ? `Kết quả tìm kiếm cho "${searchTerm}"` : 'Sân Có Sẵn Hôm Nay'}
          </h2>
          <p className="text-gray-500 text-lg">Chọn giờ vàng của bạn, đặt ngay lập tức.</p>
        </div>
        <button onClick={() => navigate('/courts')} className="text-green-600 font-semibold hover:underline hidden md:block cursor-pointer">Xem tất cả</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {activeFilteredCourts.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-10">Không tìm thấy sân nào phù hợp.</p>
        ) : (
          activeFilteredCourts.map(court => (
            <div key={court.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col md:flex-row group">
              {/* Hình ảnh */}
              <div className="w-full md:w-2/5 h-56 md:h-auto relative overflow-hidden">
                <img 
                  alt={court.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={court.type === 'trong-nha' || court.type === 'indoor' 
                        ? "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=2070&auto=format&fit=crop" 
                        : "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?q=80&w=2070&auto=format&fit=crop"} 
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-yellow-400" style={{fontVariationSettings: '"FILL" 1'}}>star</span>
                  <span className="text-xs font-bold text-gray-800">4.8</span>
                </div>
              </div>

              {/* Nội dung */}
              <div className="p-6 w-full md:w-3/5 flex flex-col">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 flex-grow">{court.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shrink-0 whitespace-nowrap uppercase tracking-wider ${
                      court.type === 'trong-nha' || court.type === 'indoor' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {court.type === 'trong-nha' || court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}
                    </span>
                    {court.status === 'maintenance' && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">construction</span>
                        Đang bảo trì
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mb-6 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  {getCourtLocation(court.name)}
                </p>

                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-gray-400 tracking-wider">GIÁ THUÊ</p>
                    <p className="text-lg font-bold text-green-600">{Number(court.price_per_hour).toLocaleString('vi-VN')}đ<span className="text-sm text-gray-400 font-normal">/giờ</span></p>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => {
                        if (court.status === 'maintenance') {
                          toast.warning('Sân này đang trong thời gian bảo trì, quý khách không thể truy cập hoặc đặt lịch!');
                          return;
                        }
                        navigate(`/courts/${court.id}`);
                      }}
                      className="flex-1 py-2 text-sm font-semibold rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    {court.status === 'maintenance' ? (
                      <button 
                        onClick={() => {
                          toast.warning('Sân này đang trong thời gian bảo trì, quý khách không thể truy cập hoặc đặt lịch!');
                        }}
                        className="flex-1 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">construction</span>
                        Đang bảo trì
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBookingClick(court)}
                        className="flex-1 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                      >
                        Đặt sân
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL ĐẶT SÂN */}
      {selectedCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 p-6 text-white text-center relative">
              <button onClick={handleCloseModal} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">sports_tennis</span>
              </div>
              <h3 className="text-xl font-bold">Xác nhận đặt sân</h3>
              <p className="text-green-100 text-sm mt-1">{selectedCourt.name}</p>
            </div>
            
            {isPayingOnline && createdBooking ? (
              <div className="p-6 space-y-6">
                {/* Tab selector */}
                <div className="flex border-b border-gray-150">
                  <button 
                    type="button"
                    onClick={() => setActivePaymentMethod('momo')} 
                    className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer border-0 bg-transparent ${
                      activePaymentMethod === 'momo' 
                        ? 'border-[#d82d8b] text-[#d82d8b] font-black' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                    Ví MoMo UAT
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActivePaymentMethod('vietqr')} 
                    className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer border-0 bg-transparent ${
                      activePaymentMethod === 'vietqr' 
                        ? 'border-emerald-500 text-emerald-600 font-black' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    VietQR CK
                  </button>
                </div>

                {activePaymentMethod === 'momo' ? (
                  <div className="space-y-6">
                    <div className="text-center bg-pink-50 text-pink-850 p-4 rounded-2xl border border-pink-100 flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="bg-[#d82d8b] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">UAT Sandbox</span>
                      </div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#d82d8b]">Ví Điện Tử MoMo</h4>
                      <p className="text-[10px] text-pink-700 mt-0.5">Quét mã QR bằng ứng dụng MoMo Developer Sandbox</p>
                    </div>

                    <div className="flex flex-col items-center justify-center relative">
                      <div className="bg-white p-4 rounded-2xl border-2 border-[#d82d8b]/20 shadow-lg relative w-max mx-auto">
                        {onlinePaymentStep === 'success' && (
                          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-4 text-center">
                            <span className="material-symbols-outlined text-6xl text-pink-600 animate-bounce mb-2">verified</span>
                            <span className="text-pink-650 font-extrabold text-sm uppercase tracking-wider">MoMo Thành Công!</span>
                            <span className="text-gray-400 text-[10px] mt-0.5">Đặt sân thành công!</span>
                          </div>
                        )}

                        {onlinePaymentStep === 'processing' ? (
                          <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-[#d82d8b] animate-spin">sync</span>
                            <span className="text-xs text-gray-500 font-bold">Đang kiểm tra MoMo UAT...</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=momo://payment?amount=${createdBooking.total_price*0.5}&orderId=PB-${createdBooking.id}`} 
                              alt="MoMo UAT Deposit"
                              className="w-[180px] h-[180px] object-contain rounded-lg" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none">
                              <div className="w-10 h-10 bg-[#d82d8b] rounded-xl flex items-center justify-center shadow-md">
                                <span className="text-white font-black text-xs">momo</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Quét QR hoặc dùng TK MoMo Sandbox</span>
                    </div>

                    <div className="text-xs space-y-2 bg-[#d82d8b]/5 p-4 rounded-xl border border-[#d82d8b]/10">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mã đơn hàng:</span>
                        <span className="font-bold text-gray-800">#PB-{createdBooking.id}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-pink-200/50 pt-2 text-[#d82d8b] font-bold">
                        <span>Số tiền cọc MoMo:</span>
                        <span>{(createdBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="bg-[#d82d8b]/10 p-2 rounded-lg text-[9px] text-[#d82d8b] leading-relaxed">
                        💡 <strong>MoMo Test Info:</strong> Dành cho MoMo UAT Sandbox testing. Đối soát tự động sẽ hoàn tất sau vài giây.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center">
                      <span className="material-symbols-outlined text-4xl mb-1 text-emerald-600 animate-pulse">payments</span>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider">Cổng Thanh Toán Trực Tuyến</h4>
                      <p className="text-[11px] text-emerald-700 mt-1">Vui lòng quét mã QR chuyển khoản tiền cọc 50%</p>
                    </div>

                    <div className="flex flex-col items-center justify-center relative">
                      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md relative w-max mx-auto">
                        {onlinePaymentStep === 'success' && (
                          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-4">
                            <span className="material-symbols-outlined text-6xl text-emerald-500 animate-pulse mb-2">verified</span>
                            <span className="text-emerald-700 font-extrabold text-sm uppercase tracking-wider">Đã Cọc 50%</span>
                            <span className="text-gray-400 text-[10px] mt-0.5">Đặt sân thành công!</span>
                          </div>
                        )}

                        {onlinePaymentStep === 'processing' ? (
                          <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-blue-600 animate-spin">sync</span>
                            <span className="text-xs text-gray-500 font-bold">Đang kiểm tra giao dịch...</span>
                          </div>
                        ) : (
                          <img 
                            src={`https://api.vietqr.io/image/970415-123456789999-vietqr_net.jpg?accountName=CLB%20PICKLEBALL%20PRO&amount=${createdBooking.total_price * 0.5}&addInfo=CK%20PB%20COC%20${createdBooking.id}`} 
                            alt="VietQR Court Deposit"
                            className="w-[180px] h-[180px] object-contain mix-blend-multiply" 
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">Quét VietQR qua app ngân hàng</span>
                    </div>

                    <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-gray-150">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mã đặt sân:</span>
                        <span className="font-bold text-gray-800">#PB-{createdBooking.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tổng tạm tính:</span>
                        <span className="font-bold text-gray-800">{Number(createdBooking.total_price).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-emerald-600 font-bold">
                        <span>Tiền đặt cọc (50%):</span>
                        <span>{(createdBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                        <span>Nội dung CK:</span>
                        <span className="font-black text-gray-700 bg-gray-250 px-1.5 py-0.5 rounded">CK PB COC {createdBooking.id}</span>
                      </div>
                    </div>
                  </div>
                )}

                {onlinePaymentStep === 'waiting' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 bg-amber-50 text-amber-800 px-3.5 py-2.5 rounded-xl border border-amber-200 text-xs font-semibold">
                      <span className="material-symbols-outlined animate-spin text-[16px]">hourglass_empty</span>
                      Đang tạm giữ ca chơi trong 10 phút ({Math.floor(paymentTimeLeft / 60)}:{String(paymentTimeLeft % 60).padStart(2, '0')})
                    </div>
                    <div className="text-[10px] text-amber-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50 text-center leading-relaxed font-medium">
                      ⏱️ Ca chơi này đã được <strong>tạm giữ chỗ riêng cho bạn trong 10 phút</strong>. Vui lòng hoàn tất cọc trước khi hết giờ.
                    </div>

                    <button 
                      type="button"
                      onClick={handleSimulatePaymentSuccess}
                      className={`w-full text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer border-0 text-xs ${
                        activePaymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      Xác nhận đã thanh toán cọc (Test)
                    </button>
                  </div>
                )}

                {onlinePaymentStep === 'success' && (
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className={`w-full text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                      activePaymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Hoàn tất &amp; Đóng
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ngày đặt</label>
                    <input 
                      type="date" 
                      value={modalDate}
                      min={getTodayString()}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-green-500 text-sm" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giờ bắt đầu chơi</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(selectedCourt.slots && selectedCourt.slots.length > 0 ? selectedCourt.slots : ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00']).map(t => {
                        const booked = isTimeSlotBooked(t);
                        const disabled = isSlotDisabled(t);
                        const selected = modalStartTime === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={disabled}
                            onClick={() => setModalStartTime(t)}
                            className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                              disabled 
                                ? 'bg-gray-50 border-gray-150 text-gray-300 line-through cursor-not-allowed opacity-40'
                                : selected
                                  ? 'bg-green-600 border-green-600 text-white shadow-sm font-extrabold scale-105'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600 cursor-pointer'
                            }`}
                          >
                            {t}
                            {booked && <span className="block text-[7px] font-normal leading-none mt-0.5">Hết</span>}
                            {!booked && disabled && <span className="block text-[7px] font-normal leading-none mt-0.5">Qua</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Thời lượng chơi</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">schedule</span>
                      <select 
                        value={modalDuration}
                        onChange={(e) => setModalDuration(Number(e.target.value))}
                        className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-green-500 bg-white text-gray-700 transition-colors appearance-none cursor-pointer"
                      >
                        <option value={1.0} disabled={!isDurationAllowed(1.0)}>1.0 giờ</option>
                        <option value={1.5} disabled={!isDurationAllowed(1.5)}>1.5 giờ (1h30p)</option>
                        <option value={2.0} disabled={!isDurationAllowed(2.0)}>2.0 giờ</option>
                        <option value={2.5} disabled={!isDurationAllowed(2.5)}>2.5 giờ (2h30p)</option>
                        <option value={3.0} disabled={!isDurationAllowed(3.0)}>3.0 giờ</option>
                        <option value={4.0} disabled={!isDurationAllowed(4.0)}>4.0 giờ</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Khung giờ:</span>
                      <span className="font-bold text-gray-700">
                        {modalDate && modalStartTime ? `${modalStartTime} - ${calculateEndTime(modalStartTime, modalDuration)}` : 'Chưa chọn'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Giá mỗi giờ:</span>
                      <span className="font-bold text-gray-700">{Number(selectedCourt.price_per_hour).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-dashed border-gray-200 pt-2">
                      <span className="text-gray-500">Tổng tạm tính:</span>
                      <span className="font-bold text-gray-900">{(Number(selectedCourt.price_per_hour) * modalDuration).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 text-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Cọc trước 50%:
                      </span>
                      <span className="font-black text-emerald-600 text-lg">
                        {((Number(selectedCourt.price_per_hour) * modalDuration) * 0.5).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic text-center mt-1">
                      * Bạn chỉ cần thanh toán trước 50% tiền cọc để giữ sân thành công!
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={confirmBooking}
                  disabled={bookingLoading}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {bookingLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">payments</span>
                      Xác nhận đặt sân
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CourtGrid;
