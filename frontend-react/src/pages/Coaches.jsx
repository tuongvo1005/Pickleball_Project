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

  useEffect(() => {
    const fetchCoaches = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get('/coaches');
        if (res.data.success) {
          const loadedCoaches = res.data.data.map((c, index) => {
            // Helper to get helper tags based on name/index
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
              rating: (4.7 + (index * 0.1) % 0.4).toFixed(1),
              reviews: 12 + index * 18,
              price: Number(c.hourly_rate),
              tags: tags
            };
          });
          setCoaches(loadedCoaches);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách HLV:", err);
        toast.error("Không thể tải danh sách huấn luyện viên.");
      } finally {
        setLoading(false);
      }
    };
    fetchCoaches();
  }, []);



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
    if (!user) {
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

  const confirmBooking = async () => {
    if (!validate()) return;
    setSending(true);
    const slot = TIME_SLOTS.find(s => s.start === selectedSlot);
    try {
      await axiosClient.post('/bookings', {
        user_id: user.id,
        coach_id: selectedCoach.userId,
        booking_date: bookingDate,
        start_time: slot.start,
        end_time: slot.end,
        total_price: selectedCoach.price * 2,
        payment_status: 'pending',
        notes: `Yêu cầu thuê HLV ${selectedCoach.name} — ${selectedCoach.specialty}`,
      });
      toast.success(`Đã gửi yêu cầu thuê HLV ${selectedCoach.name}! Ban quản trị sẽ liên hệ xác nhận lịch và duyệt yêu cầu của bạn.`);
      setSelectedCoach(null);
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
                    <span className="text-gray-600">{coach.reviews} đánh giá</span>
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
                  {TIME_SLOTS.map(slot => {
                    const isDisabled = isSlotInPast(slot.start);
                    return (
                      <option key={slot.start} value={slot.start} disabled={isDisabled}>
                        {slot.label}{isDisabled ? ' (Đã qua)' : ''}
                      </option>
                    );
                  })}
                </select>
                {errors.slot && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>{errors.slot}
                  </p>
                )}
              </div>

              {/* Tóm tắt chi phí */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Học phí (1 buổi – 2 giờ):</span>
                  <span className="font-black text-indigo-700 text-lg">
                    {(selectedCoach.price * 2).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <p className="text-xs text-indigo-400 italic mt-2">
                  * HLV sẽ nhận yêu cầu và xác nhận lịch ngay trên hệ thống.
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
    </div>
  );
};

export default Coaches;
