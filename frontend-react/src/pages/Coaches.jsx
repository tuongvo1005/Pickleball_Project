import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axiosClient from '../axiosClient';

// Các khung giờ cụ thể (2 tiếng/buổi)
const TIME_SLOTS = [
  { label: 'Sáng sớm  —  06:00 – 08:00', start: '06:00', end: '08:00' },
  { label: 'Sáng       —  08:00 – 10:00', start: '08:00', end: '10:00' },
  { label: 'Sáng muộn —  10:00 – 12:00', start: '10:00', end: '12:00' },
  { label: 'Chiều      —  14:00 – 16:00', start: '14:00', end: '16:00' },
  { label: 'Chiều muộn —  16:00 – 18:00', start: '16:00', end: '18:00' },
  { label: 'Tối        —  18:00 – 20:00', start: '18:00', end: '20:00' },
  { label: 'Tối muộn  —  20:00 – 22:00', start: '20:00', end: '22:00' },
];

const Coaches = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toast = useToast();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [sending, setSending] = useState(false);

  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [errors, setErrors] = useState({});

  const [allReviews, setAllReviews] = useState([]);
  const [selectedCoachReviewsModal, setSelectedCoachReviewsModal] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);

  // Online QR Payment States cho HLV (PT)
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [createdCoachBooking, setCreatedCoachBooking] = useState(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState('momo'); // 'momo' or 'vietqr'
  const [onlinePaymentStep, setOnlinePaymentStep] = useState('waiting'); // 'waiting', 'processing', 'success'
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(600);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [coachesRes, reviewsRes, bookingsRes] = await Promise.all([
          axiosClient.get('/coaches'),
          axiosClient.get('/reviews').catch(() => ({ data: { data: [] } })),
          axiosClient.get('/bookings').catch(() => ({ data: { data: [] } }))
        ]);

        const rawReviews = reviewsRes.data?.data || [];
        const rawBookings = bookingsRes.data?.data || [];
        setAllReviews(rawReviews);
        setExistingBookings(rawBookings);

        if (coachesRes.data.success) {
          const loadedCoaches = coachesRes.data.data
            .filter(c => !c.is_locked)
            .map((c, index) => {
            // Lọc đánh giá cho HLV này
            const coachReviewsList = rawReviews.filter(r => 
              r.reviewable_id?.toString() === c.id?.toString() && 
              r.reviewable_type?.includes('User') &&
              r.status !== 'hidden'
            );

            let calculatedRating = 5.0;
            if (coachReviewsList.length > 0) {
              const sum = coachReviewsList.reduce((acc, r) => acc + (r.rating || 5), 0);
              calculatedRating = (sum / coachReviewsList.length).toFixed(1);
            } else {
              calculatedRating = (4.8 + (index * 0.1) % 0.2).toFixed(1);
            }

            let tags = ["Tận tâm", "Kiên nhẫn"];
            if (index % 3 === 0) tags = ["Chuyên nghiệp", "Nhiệt tình"];
            else if (index % 3 === 1) tags = ["Tận tâm", "Kiên nhẫn"];
            else tags = ["Tuyển thủ", "Kỷ luật"];

            return {
              id: c.id,
              userId: c.id,
              name: c.name,
              avatar: c.avatar,
              experience: c.experience,
              specialty: c.expertise,
              rating: calculatedRating,
              reviewsCount: coachReviewsList.length,
              reviewsList: coachReviewsList,
              price: Number(c.hourly_rate),
              tags: tags
            };
          });
          setCoaches(loadedCoaches);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách HLV & đánh giá:", err);
        toast.error("Không thể tải danh sách huấn luyện viên.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isCoachBusyInSlot = (coachId, dateStr, slotStart, slotEnd) => {
    if (!coachId || !dateStr) return false;
    return existingBookings.some(b => {
      if (b.status === 'cancelled') return false;
      const isSameCoach = b.coach_id?.toString() === coachId?.toString();
      const isSameDate = b.booking_date === dateStr;
      if (!isSameCoach || !isSameDate) return false;

      const bStart = b.start_time;
      const bEnd = b.end_time;
      return (slotStart >= bStart && slotStart < bEnd) || (slotEnd > bStart && slotEnd <= bEnd);
    });
  };



  const getTodayStr = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const isSlotInPast = (slotStart) => {
    if (!bookingDate) return false;
    const todayStr = getTodayStr();
    if (bookingDate === todayStr) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      const [slotHours, slotMinutes] = slotStart.split(':').map(Number);
      
      if (currentHours > slotHours) {
        return true;
      } else if (currentHours === slotHours) {
        return currentMinutes >= slotMinutes;
      }
    }
    return false;
  };

  const handleBookCoach = (coach) => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!user || !user.id || !token) {
      toast.warning('Vui lòng đăng nhập để thuê huấn luyện viên!');
      navigate('/login');
      return;
    }
    setSelectedCoach(coach);
    setBookingDate('');
    setSelectedSlot('');
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!bookingDate) e.date = 'Vui lòng chọn ngày học.';
    else if (bookingDate < getTodayStr()) e.date = 'Ngày học phải từ hôm nay trở đi.';
    if (!selectedSlot) e.slot = 'Vui lòng chọn khung giờ.';
    else if (isSlotInPast(selectedSlot)) e.slot = 'Khung giờ này đã trôi qua. Vui lòng chọn khung giờ khác.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Đếm ngược 10 phút tạm giữ cọc HLV
  useEffect(() => {
    let timer;
    if (isPayingOnline && createdCoachBooking && onlinePaymentStep === 'waiting') {
      timer = setInterval(() => {
        setPaymentTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            toast.error("Thời gian tạm giữ lịch cọc HLV (10 phút) đã hết!");
            setIsPayingOnline(false);
            setCreatedCoachBooking(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPayingOnline, createdCoachBooking, onlinePaymentStep]);

  const handleSimulatePaymentSuccess = () => {
    if (!createdCoachBooking) return;
    setOnlinePaymentStep('processing');
    
    axiosClient.put(`/bookings/${createdCoachBooking.id}`, {
      payment_status: 'paid'
    })
    .then(() => {
      setOnlinePaymentStep('success');
      toast.success(`Đã nhận cọc 50%! Đơn thuê HLV #${createdCoachBooking.id} đã hoàn tất thanh toán cọc.`);
    })
    .catch(err => {
      console.error("Lỗi cập nhật trạng thái cọc HLV:", err);
      setOnlinePaymentStep('waiting');
      toast.error("Không thể xác thực giao dịch cọc trực tuyến.");
    });
  };

  const handleCancelHold = () => {
    if (createdCoachBooking && onlinePaymentStep === 'waiting') {
      axiosClient.put(`/bookings/${createdCoachBooking.id}`, {
        status: 'cancelled',
        payment_status: 'failed'
      })
      .then(() => {
        toast.info("Đã hủy quá trình đặt cọc giữ lịch HLV.");
      })
      .catch(err => console.error("Lỗi khi hủy giữ lịch HLV:", err));
    }
    setIsPayingOnline(false);
    setCreatedCoachBooking(null);
    setActivePaymentMethod('momo');
  };

  const confirmBooking = async () => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!user || !user.id || !token) {
      toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      navigate('/login');
      return;
    }
    if (!validate()) return;
    setSending(true);
    const slot = TIME_SLOTS.find(s => s.start === selectedSlot);
    const depositAmount = selectedCoach.price; // 50% cọc (1 giờ)
    const totalPrice = selectedCoach.price * 2;  // 100% tổng học phí (2 giờ)

    try {
      const res = await axiosClient.post('/bookings', {
        user_id: user.id,
        coach_id: selectedCoach.userId,
        booking_date: bookingDate,
        start_time: slot.start,
        end_time: slot.end,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        payment_status: 'pending',
        notes: `Yêu cầu thuê HLV ${selectedCoach.name} — Tiền cọc 50%: ${depositAmount.toLocaleString('vi-VN')}đ, Còn lại 50%: ${depositAmount.toLocaleString('vi-VN')}đ thanh toán tại quầy giữa HLV và chủ.`,
      });

      if (res.data && res.data.success) {
        toast.success(`Đã đăng ký thuê HLV ${selectedCoach.name}! Vui lòng quét mã QR để cọc 50%.`);
        setCreatedCoachBooking({
          ...res.data.data,
          coachName: selectedCoach.name,
          specialty: selectedCoach.specialty,
          depositAmount: depositAmount,
          totalPrice: totalPrice,
        });
        setIsPayingOnline(true);
        setOnlinePaymentStep('waiting');
        setPaymentTimeLeft(600);
        setSelectedCoach(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Hero Banner */}
      <section className="relative w-full h-[350px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Coaches Banner"
            className="w-full h-full object-cover opacity-40 blur-[3px]"
            src="https://images.unsplash.com/photo-1613918428409-bc97586ac943?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-indigo-950/75"></div>
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Đội Ngũ Huấn Luyện Viên
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto font-light">
            Học chuẩn kỹ thuật ngay từ đầu với các chuyên gia Pickleball hàng đầu.
          </p>
        </div>
      </section>

      {/* Danh sách HLV */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10 relative z-20">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-3xl">sports_tennis</span>
            <div className="text-left">
              <h4 className="font-extrabold text-gray-900 text-sm">Bạn chỉ muốn tìm và đặt sân chơi tự do?</h4>
              <p className="text-xs text-gray-500 mt-0.5">Đặt sân nhanh chóng với các khung giờ linh hoạt của chúng tôi.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/courts')}
            className="flex items-center gap-1 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-700 hover:shadow-md transition-all cursor-pointer border-0"
          >
            Đặt sân ngay
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl shadow-sm border border-indigo-50">
            <span className="material-symbols-outlined animate-spin text-5xl text-indigo-600 mb-3">refresh</span>
            <span className="text-gray-500 font-medium">Đang tải danh sách huấn luyện viên...</span>
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-indigo-50 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">person_search</span>
            <p className="text-gray-500 font-medium">Không tìm thấy huấn luyện viên nào hoạt động.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-white rounded-3xl border border-indigo-50 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden group flex flex-col h-full">
                <div className="relative h-32 bg-gradient-to-br from-indigo-100 to-purple-100">
                  <div className="absolute -bottom-12 w-full flex justify-center">
                    <div className="w-24 h-24 rounded-full p-1 bg-white shadow-lg relative">
                      <img src={coach.avatar} alt={coach.name} className="w-full h-full object-cover rounded-full" />
                      <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                    </div>
                  </div>
                </div>
                <div className="pt-16 pb-6 px-6 text-center flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{coach.name}</h3>
                  <p className="text-sm font-medium text-indigo-600 mb-3">{coach.specialty}</p>
                  <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                    <div className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-md font-bold">
                      <span className="material-symbols-outlined text-[16px] mr-1">star</span>
                      {coach.rating}
                    </div>
                    <span className="text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCoachReviewsModal(coach)}
                      className="text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      {coach.reviewsCount} đánh giá
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {coach.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">{tag}</span>
                    ))}
                    <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold">{coach.experience} KN</span>
                  </div>
                  <div className="border-t border-gray-100 pt-4 mt-auto w-full">
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Học phí</p>
                      <p className="text-xl font-black text-gray-900">
                        {coach.price.toLocaleString('vi-VN')}đ<span className="text-sm text-gray-500 font-normal">/giờ</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCoachReviewsModal(coach)}
                      className="w-full mb-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-indigo-100 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">rate_review</span>
                      Xem đánh giá ({coach.reviewsCount})
                    </button>
                    <button
                      onClick={() => handleBookCoach(coach)}
                      className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                      Thuê ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white text-center relative">
              <button onClick={() => setSelectedCoach(null)} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="w-20 h-20 rounded-full border-4 border-white/20 overflow-hidden mx-auto mb-3 shadow-lg">
                <img src={selectedCoach.avatar} alt={selectedCoach.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold">Thuê HLV {selectedCoach.name}</h3>
              <p className="text-indigo-200 text-sm mt-1">{selectedCoach.specialty}</p>
            </div>

            {/* Form body */}
            <div className="p-6 space-y-4">
              {/* Ngày học */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Ngày học dự kiến <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={getTodayStr()}
                  value={bookingDate}
                  onChange={e => { setBookingDate(e.target.value); setErrors(p => ({ ...p, date: '' })); }}
                  className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 transition ${
                    errors.date
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>{errors.date}
                  </p>
                )}
              </div>

              {/* Khung giờ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Khung giờ học <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSlot}
                  onChange={e => { setSelectedSlot(e.target.value); setErrors(p => ({ ...p, slot: '' })); }}
                  className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 transition ${
                    errors.slot
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                >
                  <option value="">-- Chọn khung giờ --</option>
                  {(() => {
                    const availableSlots = TIME_SLOTS.filter(slot => {
                      // Ẩn ca dạy nếu HLV đã có ca dạy/lịch bận trùng trong khung giờ này vào ngày chọn
                      return !isCoachBusyInSlot(selectedCoach?.userId, bookingDate, slot.start, slot.end);
                    });

                    if (bookingDate && availableSlots.length === 0) {
                      return (
                        <option value="" disabled>
                          ❌ HLV đã kín tất cả ca dạy trong ngày này
                        </option>
                      );
                    }

                    return availableSlots.map(slot => {
                      const isDisabled = isSlotInPast(slot.start);
                      return (
                        <option key={slot.start} value={slot.start} disabled={isDisabled}>
                          {slot.label}{isDisabled ? ' (Đã qua)' : ''}
                        </option>
                      );
                    });
                  })()}
                </select>

                {bookingDate && (() => {
                  const busyCount = TIME_SLOTS.filter(slot => 
                    isCoachBusyInSlot(selectedCoach?.userId, bookingDate, slot.start, slot.end)
                  ).length;
                  if (busyCount > 0) {
                    return (
                      <p className="text-xs text-amber-600 font-semibold mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Hệ thống đã ẩn {busyCount} ca dạy trùng lịch của HLV {selectedCoach?.name} trong ngày này.
                      </p>
                    );
                  }
                  return null;
                })()}
                {errors.slot && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>{errors.slot}
                  </p>
                )}
              </div>

              {/* Tóm tắt chi phí */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tổng học phí (1 buổi – 2 giờ):</span>
                  <span className="font-bold text-gray-900">
                    {(selectedCoach.price * 2).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-indigo-100/70">
                  <span className="text-indigo-900 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600">payments</span>
                    Tiền cọc giữ lịch HLV (50%):
                  </span>
                  <span className="font-black text-indigo-700 text-lg">
                    {(selectedCoach.price).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Còn lại thanh toán tại quầy khi đến tập (50%):</span>
                  <span className="font-semibold text-gray-700">{(selectedCoach.price).toLocaleString('vi-VN')}đ</span>
                </div>

                <p className="text-[11px] text-indigo-500 italic mt-1 leading-tight">
                  * Quy định: Bắt buộc cọc 50% để giữ lịch HLV. 50% còn lại thanh toán tại lễ tân CLB trước buổi tập.
                </p>
              </div>

              {/* Nút gửi */}
              <button
                onClick={confirmBooking}
                disabled={sending}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending
                  ? <><span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>Đang gửi...</>
                  : <><span className="material-symbols-outlined text-[20px]">send</span>Gửi yêu cầu thuê</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL XEM ĐÁNH GIÁ HLV */}
      {selectedCoachReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white relative flex items-center gap-4">
              <button 
                onClick={() => setSelectedCoachReviewsModal(null)} 
                className="absolute top-4 right-4 text-white/70 hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="w-14 h-14 rounded-full border-2 border-white/30 overflow-hidden shrink-0 shadow-md">
                <img src={selectedCoachReviewsModal.avatar} alt={selectedCoachReviewsModal.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Đánh giá từ Học viên</h3>
                <p className="text-indigo-200 text-xs">HLV {selectedCoachReviewsModal.name} — {selectedCoachReviewsModal.specialty}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-yellow-400 text-yellow-950 font-black text-xs px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    {selectedCoachReviewsModal.rating} / 5.0
                  </span>
                  <span className="text-xs text-indigo-100 font-medium">({selectedCoachReviewsModal.reviewsCount} nhận xét)</span>
                </div>
              </div>
            </div>

            {/* Review List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {selectedCoachReviewsModal.reviewsList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="material-symbols-outlined text-4xl block mb-2 text-gray-300">rate_review</span>
                  <p className="text-sm font-semibold">Chưa có đánh giá công khai nào cho HLV này.</p>
                  <p className="text-xs text-gray-400 mt-1">Hãy đăng ký học và để lại nhận xét đầu tiên sau buổi tập nhé!</p>
                </div>
              ) : (
                selectedCoachReviewsModal.reviewsList.map((review) => (
                  <div key={review.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {review.user?.name?.charAt(0) || 'H'}
                        </div>
                        <span className="font-bold text-gray-800 text-sm">{review.user?.name || 'Học viên'}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={`material-symbols-outlined text-[15px] ${
                              star <= (review.rating || 5) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                            }`}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
                      {review.comment || <span className="text-gray-400 italic">Đánh giá {review.rating}/5 sao</span>}
                    </p>
                    {review.created_at && (
                      <p className="text-[10px] text-gray-400 text-right">
                        {new Date(review.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCoachReviewsModal(null)}
                className="px-5 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP QUÉT MÃ QR THANH TOÁN CỌC 50% CHO HLV (PT) ===== */}
      {isPayingOnline && createdCoachBooking && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-emerald-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md text-white">
                  <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Xác nhận thuê HLV (PT)</h3>
                  <p className="text-xs text-emerald-100 font-medium">HLV: {createdCoachBooking.coachName || 'Chuyên gia Pickleball'}</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={handleCancelHold}
                className="text-white/80 hover:text-white transition p-1 bg-transparent border-0 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-sm">
              
              {/* Tab Selector: MoMo Sandbox / VietQR */}
              <div className="flex border-b border-gray-150">
                <button 
                  type="button"
                  onClick={() => setActivePaymentMethod('momo')} 
                  className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 bg-transparent ${
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
                  className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 bg-transparent ${
                    activePaymentMethod === 'vietqr' 
                      ? 'border-emerald-600 text-emerald-700 font-black' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  VietQR CK
                </button>
              </div>

              {/* QR Panel */}
              {activePaymentMethod === 'momo' ? (
                <div className="space-y-4">
                  <div className="text-center bg-pink-50 text-pink-900 p-3.5 rounded-2xl border border-pink-100 flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="bg-[#d82d8b] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">UAT SANDBOX</span>
                    </div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#d82d8b]">VÍ ĐIỆN TỬ MOMO</h4>
                    <p className="text-[10px] text-pink-700 mt-0.5">Quét mã QR bằng ứng dụng MoMo Developer Sandbox</p>
                  </div>

                  <div className="flex flex-col items-center justify-center relative">
                    <div className="bg-white p-3 rounded-2xl border-2 border-[#d82d8b]/20 shadow-md relative w-max mx-auto">
                      {onlinePaymentStep === 'success' && (
                        <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-3 text-center">
                          <span className="material-symbols-outlined text-5xl text-pink-600 animate-bounce mb-1">verified</span>
                          <span className="text-pink-650 font-extrabold text-xs uppercase tracking-wider">MoMo Thành Công!</span>
                          <span className="text-gray-400 text-[9px] mt-0.5">Đã cọc 50% thuê HLV!</span>
                        </div>
                      )}

                      {onlinePaymentStep === 'processing' ? (
                        <div className="w-[160px] h-[160px] flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-3xl text-[#d82d8b] animate-spin">sync</span>
                          <span className="text-[10px] text-gray-500 font-bold">Đang kiểm tra MoMo UAT...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=momo://payment?amount=${createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5}&orderId=PB-PT-${createdCoachBooking.id}`} 
                            alt="MoMo UAT Deposit HLV"
                            className="w-[160px] h-[160px] object-contain rounded-lg" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none">
                            <div className="w-8 h-8 bg-[#d82d8b] rounded-lg flex items-center justify-center shadow-md">
                              <span className="text-white font-black text-[9px]">momo</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">QUÉT QR HOẶC DÙNG TK MOMO SANDBOX</span>
                  </div>

                  <div className="text-xs space-y-2 bg-[#d82d8b]/5 p-3.5 rounded-xl border border-[#d82d8b]/10">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mã đơn thuê HLV:</span>
                      <span className="font-bold text-gray-800">#PB-{createdCoachBooking.id}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-pink-200/50 pt-2 text-[#d82d8b] font-bold">
                      <span>Số tiền cọc MoMo (50%):</span>
                      <span>{Number(createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>Còn lại tự tính trả tại quầy (50%):</span>
                      <span className="font-bold text-gray-700">{Number(createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="bg-[#d82d8b]/10 p-2 rounded-lg text-[9px] text-[#d82d8b] leading-relaxed">
                      💡 <strong>MoMo Test Info:</strong> Dành cho MoMo UAT Sandbox testing. 50% còn lại khách và HLV/chủ sân tự thanh toán trực tiếp.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl border border-emerald-100 flex flex-col items-center">
                    <span className="material-symbols-outlined text-3xl mb-1 text-emerald-600">account_balance</span>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-700">VietQR Chuyển Khoản Ngân Hàng</h4>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Quét mã QR để chuyển khoản cọc 50% giữ lịch HLV</p>
                  </div>

                  <div className="flex flex-col items-center justify-center relative">
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-md relative w-max mx-auto">
                      {onlinePaymentStep === 'success' && (
                        <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-3 text-center">
                          <span className="material-symbols-outlined text-5xl text-emerald-500 animate-pulse mb-1">verified</span>
                          <span className="text-emerald-700 font-extrabold text-xs uppercase tracking-wider">Đã Cọc 50% HLV</span>
                          <span className="text-gray-400 text-[9px] mt-0.5">Đã xác nhận thanh toán!</span>
                        </div>
                      )}

                      {onlinePaymentStep === 'processing' ? (
                        <div className="w-[160px] h-[160px] flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-3xl text-blue-600 animate-spin">sync</span>
                          <span className="text-[10px] text-gray-500 font-bold">Đang kiểm tra...</span>
                        </div>
                      ) : (
                        <img 
                          src={`https://api.vietqr.io/image/970415-123456789999-vietqr_net.jpg?accountName=CLB%20PICKLEBALL%20PRO&amount=${createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5}&addInfo=CK%20PB%20COC%20HLV%20${createdCoachBooking.id}`} 
                          alt="VietQR Coach Deposit"
                          className="w-[160px] h-[160px] object-contain mix-blend-multiply" 
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">Quét VietQR qua app ngân hàng</span>
                  </div>

                  <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-gray-150">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="font-bold text-gray-800">VietinBank (Công Thương VN)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Số tài khoản:</span>
                      <span className="font-bold text-gray-900">123456789999</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-emerald-600 font-bold">
                      <span>Tiền đặt cọc HLV (50%):</span>
                      <span>{Number(createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>Còn lại tự thanh toán tại quầy (50%):</span>
                      <span className="font-bold text-gray-700">{Number(createdCoachBooking.depositAmount || createdCoachBooking.total_price * 0.5).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Nội dung CK:</span>
                      <span className="font-black text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded">CK PB COC HLV {createdCoachBooking.id}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Action Buttons */}
              {onlinePaymentStep === 'waiting' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-2 rounded-xl border border-amber-200 text-[11px] font-semibold">
                    <span className="material-symbols-outlined animate-spin text-[14px]">hourglass_empty</span>
                    Đang tạm giữ lịch HLV ({Math.floor(paymentTimeLeft / 60)}:{String(paymentTimeLeft % 60).padStart(2, '0')})
                  </div>
                  <p className="text-[10px] text-amber-700 bg-amber-50/50 p-2 rounded-lg border border-amber-100 text-center leading-relaxed">
                    ⏱️ Lịch thuê HLV này đã được <strong>tạm giữ chỗ riêng cho bạn trong 10 phút</strong>. Vui lòng thanh toán cọc 50% trước khi hết giờ.
                  </p>

                  <button 
                    type="button"
                    onClick={handleSimulatePaymentSuccess}
                    className={`w-full text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer border-0 text-xs ${
                      activePaymentMethod === 'momo' ? 'bg-[#d82d8b] hover:bg-pink-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    Xác nhận đã thanh toán cọc (Test)
                  </button>
                </div>
              )}

              {onlinePaymentStep === 'success' ? (
                <button 
                  type="button"
                  onClick={() => {
                    setIsPayingOnline(false);
                    setCreatedCoachBooking(null);
                    setBookingDate('');
                    setSelectedSlot('');
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
                  onClick={handleCancelHold}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer border-0 text-xs"
                >
                  Hủy &amp; Quay lại
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coaches;
