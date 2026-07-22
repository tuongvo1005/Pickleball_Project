import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axiosClient from '../axiosClient';

const TABS = [
  { id: 'info', icon: 'person', label: 'Thông tin cá nhân' },
  { id: 'bookings', icon: 'calendar_today', label: 'Lịch sử đặt sân' },
  { id: 'password', icon: 'lock', label: 'Đổi mật khẩu' },
  { id: 'activity', icon: 'history', label: 'Hoạt động' },
];

const ROLE_STYLES = {
  admin: { label: 'Quản trị viên', bg: 'bg-red-100 text-red-600', avatar: 'from-red-400 to-red-600' },
  coach: { label: 'Huấn luyện viên', bg: 'bg-blue-100 text-blue-600', avatar: 'from-blue-400 to-blue-600' },
  user:  { label: 'Thành viên', bg: 'bg-green-100 text-green-600', avatar: 'from-green-400 to-green-600' },
};

const UserProfile = () => {
  const { user, setUser } = useAuthContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      fetchBookings();
    }
  }, [activeTab, user]);

  const handleCancelClick = (booking) => {
    try {
      const bookingTimeStr = `${booking.booking_date}T${booking.start_time}`;
      const bookingDateTime = new Date(bookingTimeStr);
      const now = new Date();

      // Tính khoảng cách giờ
      const diffMs = bookingDateTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        toast.warning('Không thể hủy sân do đã quá sát giờ thi đấu (dưới 24 tiếng).');
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
        toast.success(res.data.message || 'Gửi yêu cầu hủy thành công!');
        setBookings(prev => prev.map(b => 
          b.id === selectedBookingForCancel.id 
            ? { ...b, status: 'Chờ duyệt hủy', notes: (b.notes ? b.notes + "\n" : "") + "Yêu cầu hủy lịch. Lý do: " + cancelReason }
            : b
        ));
        setSelectedBookingForCancel(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi yêu cầu hủy.';
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

  const handleReviewClick = (booking) => {
    setSelectedBookingForReview(booking);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;

    let reviewableType = '';
    let reviewableId = null;

    // Tự động nhận diện đối tượng đánh giá: nếu thuê HLV thì đối tượng là User (App\Models\User), nếu đặt sân thì là Court (App\Models\Court)
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

    setSubmittingReview(true);
    try {
      const res = await axiosClient.post('/reviews', {
        user_id: user.id,
        reviewable_type: reviewableType,
        reviewable_id: reviewableId,
        rating: reviewRating,
        comment: reviewComment
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Cảm ơn bạn đã gửi đánh giá!');
        setSelectedBookingForReview(null);
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
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Lịch sử đặt sân của tôi</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Theo dõi lịch đặt sân chơi tự do và thuê huấn luyện viên</p>
                  </div>
                  <button 
                    type="button"
                    onClick={fetchBookings} 
                    disabled={loadingBookings}
                    className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className={`material-symbols-outlined ${loadingBookings ? 'animate-spin' : ''}`}>refresh</span>
                  </button>
                </div>

                {loadingBookings ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <span className="material-symbols-outlined animate-spin text-4xl text-green-600">refresh</span>
                    <span className="text-gray-500 font-medium">Đang tải lịch sử đặt sân...</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-4xl text-gray-300">calendar_today</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-500 mb-2">Chưa có lịch đặt nào</h3>
                    <p className="text-sm text-gray-400 max-w-xs mb-6">
                      Bạn chưa thực hiện đặt sân hoặc thuê huấn luyện viên nào trên hệ thống.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Mã lịch</th>
                          <th className="px-6 py-4">Thông tin sân / HLV</th>
                          <th className="px-6 py-4">Ngày & Giờ chơi</th>
                          <th className="px-6 py-4">Thành tiền</th>
                          <th className="px-6 py-4">Trạng thái</th>
                          <th className="px-6 py-4 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {bookings.map((booking) => {
                          const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && booking.status !== 'Chờ duyệt hủy';
                          
                          return (
                            <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-700">#BK{String(booking.id).padStart(4, '0')}</td>
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
                              <td className="px-6 py-4 font-bold text-green-600">
                                {Number(booking.total_price || 0).toLocaleString('vi-VN')}đ
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
                                    Đã xác nhận
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
                              <td className="px-6 py-4 text-center">
                                {canCancel ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelClick(booking)}
                                    className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-xl transition text-xs border border-red-100 active:scale-95"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                    Yêu cầu hủy
                                  </button>
                                ) : booking.status === 'completed' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReviewClick(booking)}
                                    className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-xl transition text-xs border border-blue-100 active:scale-95 hover:scale-105"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">rate_review</span>
                                    Viết đánh giá
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Không hỗ trợ</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
              Bạn đang đánh giá cho đơn đặt lịch <span className="font-bold text-gray-800">#BK{String(selectedBookingForReview.id).padStart(4, '0')}</span> - {selectedBookingForReview.coach ? `Huấn luyện viên: ${selectedBookingForReview.coach.name}` : `Sân đấu: ${selectedBookingForReview.court?.name || 'Sân Pickleball'}`}.
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
    </div>
  );
};

export default UserProfile;
