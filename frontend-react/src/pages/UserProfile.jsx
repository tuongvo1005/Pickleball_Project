import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axiosClient from '../axiosClient';

const TABS = [
  { id: 'info', icon: 'person', label: 'Thông tin cá nhân' },
  { id: 'bookings', icon: 'calendar_today', label: 'Lịch sử đặt sân' },
  { id: 'tournaments', icon: 'emoji_events', label: 'Giải đấu đã đăng ký' },
  { id: 'password', icon: 'lock', label: 'Đổi mật khẩu' },
  { id: 'activity', icon: 'history', label: 'Hoạt động' },
];

const ROLE_STYLES = {
  admin: { label: 'Quản trị viên', bg: 'bg-red-100 text-red-600', avatar: 'from-red-400 to-red-600' },
  coach: { label: 'Huấn luyện viên', bg: 'bg-blue-100 text-blue-600', avatar: 'from-blue-400 to-blue-600' },
  user:  { label: 'Thành viên', bg: 'bg-green-100 text-green-600', avatar: 'from-green-400 to-green-600' },
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Tournaments state
  const [myTournaments, setMyTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [selectedTournamentForLeave, setSelectedTournamentForLeave] = useState(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilterTab, setBookingFilterTab] = useState('all'); // 'all', 'upcoming', 'completed', 'cancelled'
  const [bookingSortOrder, setBookingSortOrder] = useState('desc'); // 'desc': mới nhất tới cũ nhất (mặc định), 'asc': cũ nhất tới mới nhất
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null); // Modal chi tiết đơn

  // Reviews state
  const [userReviews, setUserReviews] = useState([]);
  const [existingReviewId, setExistingReviewId] = useState(null);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await axiosClient.get('/bookings');
      const list = res.data.data || [];
      const userBookings = list.filter(b => b.user_id?.toString() === user?.id?.toString());
      setBookings(userBookings);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lịch sử đặt sân.');
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const res = await axiosClient.get('/reviews');
      if (res.data.success) {
        setUserReviews((res.data.data || []).filter(r => r.user_id?.toString() === user?.id?.toString()));
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách đánh giá:", err);
    }
  };

  const isBookingCompleted = (booking) => {
    if (!booking) return false;
    if (booking.status === 'completed') return true;
    if (booking.status === 'cancelled' || booking.status === 'Chờ duyệt hủy') return false;
    
    // Nếu ca chơi/HLV đã trôi qua mốc ngày & giờ kết thúc -> tự động xem như đã hoàn thành ca
    if (booking.booking_date && booking.end_time) {
      try {
        const [hours, minutes] = booking.end_time.split(':').map(Number);
        const bookingEndTime = new Date(booking.booking_date);
        bookingEndTime.setHours(hours || 23, minutes || 59, 0, 0);
        const now = new Date();
        if (now > bookingEndTime && (booking.status === 'confirmed' || booking.payment_status === 'paid' || booking.status === 'pending')) {
          return true;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return false;
  };

  const fetchMyTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const res = await axiosClient.get('/tournaments');
      const list = res.data.data || [];
      const registered = list.filter(t => 
        t.participants && t.participants.some(p => p.id?.toString() === user?.id?.toString())
      );
      setMyTournaments(registered);
    } catch (err) {
      console.error("Lỗi lấy danh sách giải đấu đã đăng ký:", err);
      toast.error('Không thể tải danh sách giải đấu đã đăng ký.');
    } finally {
      setLoadingTournaments(false);
    }
  };

  const handleConfirmLeaveTournament = async () => {
    if (!selectedTournamentForLeave) return;
    setSubmittingLeave(true);
    try {
      const res = await axiosClient.post(`/tournaments/${selectedTournamentForLeave.id}/leave`, {
        user_id: user.id
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Đã hủy đăng ký giải đấu thành công!');
        setSelectedTournamentForLeave(null);
        fetchMyTournaments();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi hủy đăng ký.';
      toast.error(msg);
    } finally {
      setSubmittingLeave(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      fetchBookings();
      fetchUserReviews();
    } else if (activeTab === 'tournaments' && user) {
      fetchMyTournaments();
    }
  }, [activeTab, user]);

  const handleCancelClick = (booking) => {
    try {
      const bookingTimeStr = `${booking.booking_date}T${booking.start_time}`;
      const bookingDateTime = new Date(bookingTimeStr);
      const now = new Date();

      // Tính khoảng cách giờ (Cần ít nhất 24h - 1 ngày trước ca chơi)
      const diffMs = bookingDateTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        toast.warning('Quy định: Chỉ được gửi yêu cầu hủy lịch đặt sân trước thời gian nhận sân ít nhất 24 tiếng (1 ngày)!');
        return;
      }

      setSelectedBookingForCancel(booking);
      setCancelReason('');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi kiểm tra thời gian ca đặt.');
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.warning('Vui lòng nhập lý do hủy lịch.');
      return;
    }

    setSubmittingCancel(true);
    try {
      const res = await axiosClient.post(`/bookings/${selectedBookingForCancel.id}/cancel-request`, {
        reason: cancelReason
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Gửi yêu cầu hủy lịch thành công! Hệ thống đã gửi thông báo đến Admin.');
        setBookings(prev => prev.map(b => 
          b.id === selectedBookingForCancel.id 
            ? { ...b, status: 'Chờ duyệt hủy', notes: (b.notes ? b.notes + "\n" : "") + "Yêu cầu hủy lịch. Lý do: " + cancelReason }
            : b
        ));
        setSelectedBookingForCancel(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Quy định: Chỉ được gửi yêu cầu hủy lịch đặt sân trước thời gian nhận sân ít nhất 24 tiếng (1 ngày)!';
      toast.error(msg);
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Polymorphic Review state
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewClick = (booking, targetType = 'auto') => {
    let reviewableType = 'App\\Models\\Court';
    let reviewableId = booking.court_id;

    if (targetType === 'coach' || (targetType === 'auto' && booking.coach_id && !booking.court_id)) {
      reviewableType = 'App\\Models\\User';
      reviewableId = booking.coach_id;
    }

    const reviewObj = {
      ...booking,
      _targetType: reviewableType,
      _targetId: reviewableId
    };

    setSelectedBookingForReview(reviewObj);

    // Tìm xem người dùng đã đánh giá đối tượng này chưa
    const existing = userReviews.find(r => 
      r.reviewable_id?.toString() === reviewableId?.toString() && 
      r.reviewable_type === reviewableType
    );

    if (existing) {
      setExistingReviewId(existing.id);
      setReviewRating(existing.rating || 5);
      setReviewComment(existing.comment || '');
    } else {
      setExistingReviewId(null);
      setReviewRating(5);
      setReviewComment('');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;

    let reviewableType = selectedBookingForReview._targetType;
    let reviewableId = selectedBookingForReview._targetId;

    if (!reviewableType || !reviewableId) {
      if (selectedBookingForReview.coach_id) {
        reviewableType = 'App\\Models\\User';
        reviewableId = selectedBookingForReview.coach_id;
      } else if (selectedBookingForReview.court_id) {
        reviewableType = 'App\\Models\\Court';
        reviewableId = selectedBookingForReview.court_id;
      } else {
        toast.error('Không tìm thấy đối tượng hợp lệ để đánh giá.');
        return;
      }
    }

    setSubmittingReview(true);
    try {
      let res;
      if (existingReviewId) {
        res = await axiosClient.put(`/reviews/${existingReviewId}`, {
          rating: reviewRating,
          comment: reviewComment
        });
      } else {
        res = await axiosClient.post('/reviews', {
          user_id: user.id,
          reviewable_type: reviewableType,
          reviewable_id: reviewableId,
          rating: reviewRating,
          comment: reviewComment
        });
      }

      if (res.data.success) {
        toast.success(res.data.message || (existingReviewId ? 'Cập nhật đánh giá thành công!' : 'Cảm ơn bạn đã gửi đánh giá!'));
        setSelectedBookingForReview(null);
        fetchUserReviews();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.';
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Form state - info
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  // Form state - password
  const [pwForm, setPwForm] = useState({
    password: '',
    password_confirmation: '',
  });

  const role = ROLE_STYLES[user?.role] || ROLE_STYLES.user;

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate kích thước (tối đa 4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.warning('Kích thước ảnh không được vượt quá 4MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await axiosClient.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        setUser(res.data.data);
        toast.success('Cập nhật ảnh đại diện thành công!');
      } else {
        toast.error(res.data.message || 'Không thể tải ảnh lên.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên.';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axiosClient.put('/profile', form);
      const updated = res.data.data;
      setUser(updated);
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.password_confirmation) {
      toast.warning('Mật khẩu xác nhận không khớp!');
      return;
    }
    setSaving(true);
    try {
      await axiosClient.put('/profile', pwForm);
      toast.success('Đổi mật khẩu thành công!');
      setPwForm({ password: '', password_confirmation: '' });
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.password) toast.error(errors.password[0]);
      else toast.error('Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };



  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <span className="material-symbols-outlined text-6xl mb-3 block">lock</span>
          <p className="font-semibold">Vui lòng đăng nhập để xem trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* ===== HEADER CARD ===== */}
        <div className="bg-white rounded-3xl shadow-lg mb-6">
          {/* Banner — avatar absolute bên trong để tránh z-index bị che */}
          <div className={`relative h-32 bg-gradient-to-r ${role.avatar} opacity-90 rounded-t-3xl`}>
            <div className={`absolute -bottom-12 left-8 w-24 h-24 rounded-2xl bg-gradient-to-br ${role.avatar} text-white flex items-center justify-center text-4xl font-black shadow-xl border-4 border-white z-10 overflow-hidden group`}
              style={{ opacity: 1 }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )}
              
              {/* Overlay upload ảnh đại diện */}
              <div 
                onClick={() => document.getElementById('avatar-file-input').click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-300 rounded-2xl z-20"
              >
                {uploadingAvatar ? (
                  <span className="material-symbols-outlined animate-spin text-[24px]">autorenew</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                    <span className="text-[10px] font-bold mt-1">Thay đổi</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                id="avatar-file-input" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </div>
          </div>

          {/* Info row — pt-16 chừa chỗ cho avatar */}
          <div className="px-8 pt-16 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Name & role */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${role.bg}`}>
                    {role.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                {user.bio && (
                  <p className="text-sm text-gray-600 mt-2 italic">"{user.bio}"</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABS + CONTENT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors border-l-4 ${
                    activeTab === tab.id
                      ? 'bg-green-50 text-green-600 border-green-500 font-bold'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contact info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Liên hệ</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[18px] text-gray-400">mail</span>
                <span className="text-gray-700 truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[18px] text-gray-400">phone</span>
                <span className="text-gray-700">{user.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[18px] text-gray-400">badge</span>
                <span className="text-gray-700">#UID{String(user.id || 0).padStart(4, '0')}</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">

            {/* TAB: Thông tin cá nhân */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Thông tin cá nhân</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Cập nhật tên, số điện thoại và giới thiệu bản thân</p>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-gray-100">person_edit</span>
                </div>
                <form onSubmit={handleSaveInfo} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Họ và tên *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-gray-400">person</span>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-gray-300">mail</span>
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full border border-gray-100 rounded-xl pl-11 pr-4 py-3 bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-gray-400">phone</span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                        placeholder="09xx xxx xxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giới thiệu bản thân</label>
                    <textarea
                      rows={4}
                      value={form.bio}
                      onChange={e => setForm({ ...form, bio: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition resize-none"
                      placeholder="Viết vài dòng giới thiệu về bản thân, kinh nghiệm chơi pickleball..."
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300 ký tự</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px]">save</span>
                      )}
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: Đổi mật khẩu */}
            {activeTab === 'password' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Đổi mật khẩu</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Mật khẩu mới phải có ít nhất 6 ký tự</p>
                </div>
                <form onSubmit={handleChangePassword} className="p-8 space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mật khẩu mới *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-gray-400">lock</span>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={pwForm.password}
                        onChange={e => setPwForm({ ...pwForm, password: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                        placeholder="Tối thiểu 6 ký tự"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Xác nhận mật khẩu mới *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-gray-400">lock_reset</span>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={pwForm.password_confirmation}
                        onChange={e => setPwForm({ ...pwForm, password_confirmation: e.target.value })}
                        className={`w-full border rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 transition ${
                          pwForm.password_confirmation && pwForm.password !== pwForm.password_confirmation
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
                        }`}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                    {pwForm.password_confirmation && pwForm.password !== pwForm.password_confirmation && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        Mật khẩu không khớp
                      </p>
                    )}
                  </div>

                  {/* Security tips */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Gợi ý bảo mật
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• Dùng ít nhất 8 ký tự</li>
                      <li>• Kết hợp chữ hoa, chữ thường và số</li>
                      <li>• Không dùng thông tin cá nhân dễ đoán</li>
                    </ul>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving || (pwForm.password !== pwForm.password_confirmation && !!pwForm.password_confirmation)}
                      className="flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px]">key</span>
                      )}
                      {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: Lịch sử đặt sân */}
            {activeTab === 'bookings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Lịch sử đặt sân của tôi</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Theo dõi lịch đặt sân chơi tự do và thuê huấn luyện viên</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      title="Bấm để đổi thứ tự sắp xếp (Mới nhất <-> Cũ nhất)"
                    >
                      <span className="material-symbols-outlined text-[16px] text-green-600 font-bold">swap_vert</span>
                      <span>Thứ tự: <strong className="text-green-700">{bookingSortOrder === 'desc' ? 'Mới nhất ➔ Cũ nhất' : 'Cũ nhất ➔ Mới nhất'}</strong></span>
                    </button>
                    <button 
                      type="button"
                      onClick={fetchBookings} 
                      disabled={loadingBookings}
                      className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                      title="Tải lại danh sách"
                    >
                      <span className={`material-symbols-outlined ${loadingBookings ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                  </div>
                </div>

                {/* Thanh Phân Loại Tab Đơn Hang (Luồng sự kiện phụ) */}
                <div className="flex border-b border-gray-100 px-8 bg-gray-50/60 gap-4 pt-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setBookingFilterTab('all')}
                    className={`pb-3 font-bold text-xs uppercase tracking-wider cursor-pointer transition border-b-2 whitespace-nowrap ${
                      bookingFilterTab === 'all' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Tất cả ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingFilterTab('upcoming')}
                    className={`pb-3 font-bold text-xs uppercase tracking-wider cursor-pointer transition border-b-2 whitespace-nowrap ${
                      bookingFilterTab === 'upcoming' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sắp tới ({bookings.filter(b => (b.status === 'pending' || b.status === 'confirmed' || b.status === 'Chờ duyệt hủy') && !isBookingCompleted(b)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingFilterTab('completed')}
                    className={`pb-3 font-bold text-xs uppercase tracking-wider cursor-pointer transition border-b-2 whitespace-nowrap ${
                      bookingFilterTab === 'completed' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Đã hoàn thành ({bookings.filter(b => isBookingCompleted(b)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingFilterTab('cancelled')}
                    className={`pb-3 font-bold text-xs uppercase tracking-wider cursor-pointer transition border-b-2 whitespace-nowrap ${
                      bookingFilterTab === 'cancelled' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Đã hủy ({bookings.filter(b => b.status === 'cancelled').length})
                  </button>
                </div>

                {loadingBookings ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <span className="material-symbols-outlined animate-spin text-4xl text-green-600">refresh</span>
                    <span className="text-gray-500 font-medium">Đang tải lịch sử đặt sân...</span>
                  </div>
                ) : (() => {
                  const filteredBookings = bookings.filter(b => {
                    if (bookingFilterTab === 'upcoming') return (b.status === 'pending' || b.status === 'confirmed' || b.status === 'Chờ duyệt hủy') && !isBookingCompleted(b);
                    if (bookingFilterTab === 'completed') return isBookingCompleted(b);
                    if (bookingFilterTab === 'cancelled') return b.status === 'cancelled';
                    return true;
                  });

                  // Mặc định sắp xếp MỚI NHẤT -> CŨ NHẤT theo ID hoặc ngày tạo
                  const sortedBookings = [...filteredBookings].sort((a, b) => {
                    const timeA = new Date(a.created_at || a.booking_date || 0).getTime() || Number(a.id);
                    const timeB = new Date(b.created_at || b.booking_date || 0).getTime() || Number(b.id);

                    if (bookingSortOrder === 'desc') {
                      return timeB - timeA || Number(b.id) - Number(a.id);
                    } else {
                      return timeA - timeB || Number(a.id) - Number(b.id);
                    }
                  });

                  if (sortedBookings.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-3xl text-gray-300">calendar_today</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-600 mb-1">Bạn chưa có lịch đặt sân nào.</h3>
                        <p className="text-xs text-gray-400 max-w-xs">
                          {bookingFilterTab === 'upcoming' && 'Không tìm thấy lịch đặt sân nào sắp tới.'}
                          {bookingFilterTab === 'completed' && 'Bạn chưa có lượt chơi nào đã hoàn thành.'}
                          {bookingFilterTab === 'cancelled' && 'Không có đơn đặt sân nào bị hủy.'}
                          {bookingFilterTab === 'all' && 'Bạn chưa thực hiện giao dịch đặt sân nào trên hệ thống.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th 
                              onClick={() => setBookingSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                              className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition select-none group"
                              title="Bấm để đổi thứ tự sắp xếp"
                            >
                              <div className="flex items-center gap-1">
                                <span>Mã đơn</span>
                                <span className="material-symbols-outlined text-[15px] text-green-600 font-bold">
                                  {bookingSortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-4">Thông tin sân / HLV</th>
                            <th 
                              onClick={() => setBookingSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                              className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition select-none group"
                              title="Bấm để đổi thứ tự sắp xếp"
                            >
                              <div className="flex items-center gap-1">
                                <span>Ngày & Giờ chơi</span>
                                <span className="material-symbols-outlined text-[15px] text-green-600 font-bold">
                                  {bookingSortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-4">Thành tiền</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {sortedBookings.map((booking) => {
                            const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && booking.status !== 'Chờ duyệt hủy';
                            const reviewableType = booking.coach_id ? 'App\\Models\\User' : 'App\\Models\\Court';
                            const reviewableId = booking.coach_id || booking.court_id;
                            const hasReviewed = userReviews.some(r => r.reviewable_id?.toString() === reviewableId?.toString() && r.reviewable_type === reviewableType);
                            
                            return (
                              <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBookingDetail(booking)}
                                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                                    title="Bấm để xem chi tiết lịch đặt sân"
                                  >
                                    #BK{String(booking.id).padStart(4, '0')}
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                  </button>
                                </td>
                                <td className="px-6 py-4">
                                  {booking.court ? (
                                    <div>
                                      <p className="font-bold text-gray-800">{booking.court.name}</p>
                                      <p className="text-xs text-gray-400">Sân chơi tự do</p>
                                    </div>
                                  ) : booking.coach ? (
                                    <div>
                                      <p className="font-bold text-gray-800">HLV: {booking.coach.name}</p>
                                      {booking.court && <p className="text-xs text-gray-400">{booking.court.name}</p>}
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="font-bold text-gray-800">Sân đấu tự động</p>
                                      <p className="text-xs text-gray-400">Đặt lịch chơi</p>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-medium text-gray-700">{booking.booking_date}</p>
                                  <p className="text-xs text-gray-400 font-medium">{booking.start_time} - {booking.end_time}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-extrabold text-green-600">
                                    {Number(booking.deposit_amount || (booking.total_price || 0) * 0.5).toLocaleString('vi-VN')}đ
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium">
                                    Cọc 50% (Tổng {Number(booking.total_price || 0).toLocaleString('vi-VN')}đ)
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {booking.status === 'Chờ duyệt hủy' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Chờ duyệt hủy
                                    </span>
                                  ) : booking.status === 'cancelled' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                      Đã hủy
                                    </span>
                                  ) : booking.status === 'confirmed' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                      Đã cọc 50%
                                    </span>
                                  ) : booking.status === 'completed' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      Đã hoàn tất
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      Chờ duyệt
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBookingDetail(booking)}
                                      className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2.5 py-1 rounded-lg transition text-xs cursor-pointer"
                                      title="Xem chi tiết"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                                      Chi tiết
                                    </button>

                                    {booking.status === 'completed' && (
                                       <div className="flex flex-wrap items-center gap-1.5 justify-center">
                                         {booking.coach && (
                                           <button
                                             type="button"
                                             onClick={() => handleReviewClick(booking, 'coach')}
                                             className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition text-xs border cursor-pointer ${
                                               userReviews.some(r => r.reviewable_id?.toString() === booking.coach_id?.toString() && r.reviewable_type === 'App\\Models\\User')
                                                 ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                                 : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                             }`}
                                           >
                                             <span className="material-symbols-outlined text-[14px]">sports_tennis</span>
                                             {userReviews.some(r => r.reviewable_id?.toString() === booking.coach_id?.toString() && r.reviewable_type === 'App\\Models\\User')
                                               ? 'Sửa ĐG HLV'
                                               : 'Đánh giá HLV'}
                                           </button>
                                         )}

                                         {booking.court && (
                                           <button
                                             type="button"
                                             onClick={() => handleReviewClick(booking, 'court')}
                                             className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition text-xs border cursor-pointer ${
                                               userReviews.some(r => r.reviewable_id?.toString() === booking.court_id?.toString() && r.reviewable_type === 'App\\Models\\Court')
                                                 ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                                 : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                                             }`}
                                           >
                                             <span className="material-symbols-outlined text-[14px]">stadium</span>
                                             {userReviews.some(r => r.reviewable_id?.toString() === booking.court_id?.toString() && r.reviewable_type === 'App\\Models\\Court')
                                               ? 'Sửa ĐG Sân'
                                               : 'Đánh giá Sân'}
                                           </button>
                                         )}
                                       </div>
                                     )}

                                    {canCancel && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancelClick(booking)}
                                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-lg transition text-xs border border-red-100 cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                                        Yêu cầu hủy
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB: Giải đấu đã đăng ký */}
            {activeTab === 'tournaments' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Giải đấu đã đăng ký</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Quản lý các giải đấu Pickleball bạn đã đăng ký tham gia</p>
                  </div>
                  <button 
                    type="button"
                    onClick={fetchMyTournaments} 
                    disabled={loadingTournaments}
                    className="p-2 text-gray-500 hover:text-orange-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  >
                    <span className={`material-symbols-outlined ${loadingTournaments ? 'animate-spin' : ''}`}>refresh</span>
                  </button>
                </div>

                {loadingTournaments ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <span className="material-symbols-outlined animate-spin text-4xl text-orange-500">refresh</span>
                    <span className="text-gray-500 font-medium">Đang tải danh sách giải đấu...</span>
                  </div>
                ) : myTournaments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 text-orange-500">
                      <span className="material-symbols-outlined text-3xl">emoji_events</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-600 mb-1">Bạn chưa đăng ký giải đấu nào.</h3>
                    <p className="text-xs text-gray-400 max-w-xs mb-6">
                      Hãy khám phá và tham gia các giải đấu Pickleball sôi động ngay hôm nay!
                    </p>
                    <button 
                      onClick={() => navigate('/tournaments')}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">search</span>
                      Xem các giải đấu sắp tới
                    </button>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {myTournaments.map((tournament) => (
                      <div key={tournament.id} className="bg-gradient-to-r from-orange-50/50 to-amber-50/30 rounded-2xl border border-orange-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                            🏆
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Đã đăng ký
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-orange-500">calendar_today</span>
                                Khởi tranh: <strong>{tournament.start_date}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-orange-500">location_on</span>
                                {tournament.location || 'TP. Hồ Chí Minh'}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-orange-500">payments</span>
                                Giải thưởng: <strong>{tournament.prize || 'Hấp dẫn'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-orange-100/60 pt-4 md:pt-0">
                          <button
                            type="button"
                            onClick={() => setSelectedTournamentForLeave(tournament)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-xl transition text-xs border border-red-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[16px]">person_remove</span>
                            Hủy đăng ký giải
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Hoạt động */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Hoạt động gần đây</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Lịch sử các hoạt động của bạn trên hệ thống</p>
                </div>
                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-4xl text-gray-300">history</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-500 mb-2">Chưa có hoạt động nào</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Các hoạt động như đặt sân, đăng ký giải đấu hay mua hàng sẽ xuất hiện ở đây.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal Yêu cầu Hủy đơn đặt lịch */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setSelectedBookingForCancel(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-black">Yêu cầu hủy lịch đặt</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Bạn đang gửi yêu cầu hủy lịch đặt sân <span className="font-bold text-gray-800">#BK{String(selectedBookingForCancel.id).padStart(4, '0')}</span> ngày <span className="font-bold text-gray-800">{selectedBookingForCancel.booking_date}</span> lúc <span className="font-bold text-gray-800">{selectedBookingForCancel.start_time}</span>.
            </p>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lý do hủy sân *</label>
                <textarea
                  required
                  rows={4}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do cụ thể (bận đột xuất, thời tiết xấu, đổi lịch...)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition resize-none text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {submittingCancel ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  {submittingCancel ? 'Đang gửi...' : 'Xác nhận gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Viết Đánh Giá Đa Hình */}
      {selectedBookingForReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setSelectedBookingForReview(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 text-orange-600 mb-4">
              <span className="material-symbols-outlined text-3xl">rate_review</span>
              <h3 className="text-lg font-black">Viết đánh giá dịch vụ</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Bạn đang đánh giá cho {selectedBookingForReview._targetType === 'App\\Models\\User' ? (
                <>Huấn luyện viên: <span className="font-bold text-indigo-700">{selectedBookingForReview.coach?.name || 'HLV'}</span></>
              ) : (
                <>Sân đấu: <span className="font-bold text-blue-700">{selectedBookingForReview.court?.name || 'Sân Pickleball'}</span></>
              )} (Mã đơn <span className="font-bold text-gray-800">#BK{String(selectedBookingForReview.id).padStart(4, '0')}</span>).
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Chọn số sao */}
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số sao đánh giá</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none transition-transform active:scale-95"
                    >
                      <span className={`material-symbols-outlined text-3xl ${
                        star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-600 mt-1">
                  {reviewRating === 5 && 'Tuyệt vời! ⭐⭐⭐⭐⭐'}
                  {reviewRating === 4 && 'Rất tốt! ⭐⭐⭐⭐'}
                  {reviewRating === 3 && 'Tốt / Bình thường ⭐⭐⭐'}
                  {reviewRating === 2 && 'Chưa hài lòng ⭐⭐'}
                  {reviewRating === 1 && 'Rất kém ⭐'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nội dung đánh giá</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Hãy chia sẻ trải nghiệm của bạn về chất lượng sân đấu hoặc sự hướng dẫn của huấn luyện viên..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition resize-none text-sm"
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForReview(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex items-center gap-1.5 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {submittingReview ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Lịch Đặt Sân (<Extend Case Use> Xem chi tiết lịch đặt) */}
      {selectedBookingDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gray-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400 text-2xl">receipt_long</span>
                <div>
                  <h3 className="font-bold text-base">Chi Tiết Đơn Đặt Sân #BK{String(selectedBookingDetail.id).padStart(4, '0')}</h3>
                  <p className="text-xs text-gray-400">Ngày tạo đơn: {selectedBookingDetail.created_at ? new Date(selectedBookingDetail.created_at).toLocaleDateString('vi-VN') : 'Mới tạo'}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBookingDetail(null)}
                className="text-gray-400 hover:text-white transition p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-sm">
              {/* Cụm sân & Khung giờ */}
              <div className="bg-green-50/70 p-4 rounded-2xl border border-green-100 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-green-900 text-base">{selectedBookingDetail.court?.name || 'Sân Pickleball Kỳ Hòa (Quận 10)'}</h4>
                    <p className="text-xs text-green-700 font-medium">Sân chơi tự do Pickleball tiêu chuẩn</p>
                  </div>
                  <span className="bg-green-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full">
                    {selectedBookingDetail.status === 'completed' ? 'Đã hoàn thành' : selectedBookingDetail.status === 'confirmed' ? 'Đã xác nhận' : selectedBookingDetail.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-green-200/60 flex items-center justify-between text-xs text-green-900 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {selectedBookingDetail.booking_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {selectedBookingDetail.start_time} - {selectedBookingDetail.end_time}
                  </span>
                </div>
              </div>

              {/* Thông tin HLV nếu có */}
              {selectedBookingDetail.coach && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                      {selectedBookingDetail.coach.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">Thuê Huấn luyện viên: {selectedBookingDetail.coach.name}</p>
                      <p className="text-[11px] text-gray-500">{selectedBookingDetail.coach.phone || 'Hỗ trợ kỹ thuật 1-on-1'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bảng Chi Tiết Thanh Toán & Cọc 50% */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Chi tiết thanh toán</h4>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng giá trị ca sân & HLV:</span>
                    <span className="font-bold text-gray-900">{Number(selectedBookingDetail.total_price || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">payments</span>
                      Tiền đặt cọc 50%:
                    </span>
                    <span className="font-extrabold">{Number((selectedBookingDetail.total_price || 0) / 2).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Trạng thái cọc trực tuyến:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${selectedBookingDetail.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {selectedBookingDetail.payment_status === 'paid' ? 'Đã cọc 50% qua MoMo/VietQR' : 'Chờ đặt cọc'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                    <span>Số tiền còn lại trả tại sân:</span>
                    <span className="text-blue-600">{Number((selectedBookingDetail.total_price || 0) / 2).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              {selectedBookingDetail.notes && (
                <div className="text-xs bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-800">
                  <strong>Ghi chú:</strong> {selectedBookingDetail.notes}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBookingDetail(null)}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-md"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN HỦY ĐĂNG KÝ GIẢI ĐẤU */}
      {selectedTournamentForLeave && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setSelectedTournamentForLeave(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-black">Xác nhận hủy đăng ký</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc chắn muốn **hủy đăng ký** tham gia giải đấu này không? Suất đăng ký của bạn sẽ được nhường lại cho đấu thủ khác.
            </p>

            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 mb-6 text-sm text-gray-800">
              <div className="font-bold text-orange-900 mb-1">
                {selectedTournamentForLeave.name}
              </div>
              <div className="text-xs text-orange-700">
                Khởi tranh: {selectedTournamentForLeave.start_date} • Địa điểm: {selectedTournamentForLeave.location || 'TP. Hồ Chí Minh'}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSelectedTournamentForLeave(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmLeaveTournament}
                disabled={submittingLeave}
                className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm cursor-pointer"
              >
                {submittingLeave ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">person_remove</span>
                )}
                {submittingLeave ? 'Đang hủy...' : 'Xác nhận hủy đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
