import { useState, useEffect } from 'react';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: '', // 'approve' or 'cancel'
    bookingId: null,
    title: '',
    message: '',
    color: 'green' // 'green' for approve, 'red' for cancel
  });

  const [coaches, setCoaches] = useState([]);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  // Edit booking modal states
  const [courts, setCourts] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    court_id: '',
    coach_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    status: '',
    payment_status: '',
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchBookings = () => {
    setLoading(true);
    axiosClient.get('/bookings')
      .then(response => {
        setBookings(response.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách đặt sân:", err);
        setError("Không thể lấy dữ liệu từ hệ thống.");
        setLoading(false);
      });
  };

  const fetchCoaches = () => {
    axiosClient.get('/admin/users')
      .then(response => {
        if (response.data.success) {
          const list = response.data.data.filter(u => u.role === 'coach');
          setCoaches(list);
        }
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách HLV:", err);
      });
  };

  const fetchCourts = () => {
    axiosClient.get('/courts')
      .then(response => {
        setCourts(response.data.data || []);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách sân:", err);
      });
  };

  useEffect(() => {
    fetchBookings();
    fetchCoaches();
    fetchCourts();
  }, []);

  const handleOpenEditModal = (booking) => {
    setEditingBooking(booking);
    setEditForm({
      court_id: booking.court_id || '',
      coach_id: booking.coach_id || '',
      booking_date: booking.booking_date || '',
      start_time: booking.start_time || '',
      end_time: booking.end_time || '',
      status: booking.status || 'pending',
      payment_status: booking.payment_status || 'pending',
      notes: booking.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingBooking) return;
    setEditLoading(true);

    let formattedStart = editForm.start_time;
    let formattedEnd = editForm.end_time;
    if (formattedStart && formattedStart.length === 8) {
      formattedStart = formattedStart.substring(0, 5);
    }
    if (formattedEnd && formattedEnd.length === 8) {
      formattedEnd = formattedEnd.substring(0, 5);
    }

    const payload = {
      ...editForm,
      start_time: formattedStart,
      end_time: formattedEnd,
      court_id: editForm.court_id || null,
      coach_id: editForm.coach_id || null,
    };

    axiosClient.put(`/bookings/${editingBooking.id}`, payload)
      .then(res => {
        if (res.data.success) {
          toast.success('Cập nhật đơn đặt lịch thành công!');
          setShowEditModal(false);
          setEditingBooking(null);
          fetchBookings();
        } else {
          toast.error(res.data.message || 'Cập nhật thất bại.');
        }
      })
      .catch(err => {
        console.error("Lỗi cập nhật lịch:", err);
        const msg = err.response?.data?.message || 'Không thể cập nhật lịch đặt.';
        toast.error(msg);
      })
      .finally(() => {
        setEditLoading(false);
      });
  };

  const handleTriggerApprove = (bookingId) => {
    setConfirmModal({
      show: true,
      type: 'approve',
      bookingId,
      title: 'Phê Duyệt Đơn Đặt Sân',
      message: 'Bạn có chắc chắn muốn xác nhận đã thu tiền và duyệt thành công đơn đặt sân này không?',
      color: 'green'
    });
  };

  const handleTriggerCancel = (bookingId) => {
    setConfirmModal({
      show: true,
      type: 'cancel',
      bookingId,
      title: 'Hủy Đơn Đặt Sân',
      message: 'Bạn có chắc chắn muốn hủy đơn đặt sân này không? Lịch đặt của khung giờ này sẽ được giải phóng.',
      color: 'red'
    });
  };

  const handleExecuteConfirm = () => {
    const { type, bookingId } = confirmModal;
    if (type === 'approve') {
      axiosClient.put(`/bookings/${bookingId}`, { payment_status: 'paid' })
        .then(() => {
          toast.success('Đã phê duyệt đơn đặt sân thành công!');
          setConfirmModal(prev => ({ ...prev, show: false }));
          fetchBookings();
        })
        .catch(err => {
          console.error("Lỗi khi duyệt đặt sân:", err);
          toast.error('Không thể cập nhật trạng thái đơn đặt sân.');
        });
    } else if (type === 'cancel') {
      axiosClient.delete(`/bookings/${bookingId}`)
        .then(() => {
          toast.success('Đã hủy đơn đặt sân thành công!');
          setConfirmModal(prev => ({ ...prev, show: false }));
          fetchBookings();
        })
        .catch(err => {
          console.error("Lỗi khi hủy đơn đặt sân:", err);
          toast.error('Không thể hủy đơn đặt sân.');
        });
    }
  };

  const handleTriggerAssignCoach = (booking) => {
    setSelectedBooking(booking);
    setSelectedCoachId(booking.coach_id || '');
    setShowCoachModal(true);
  };

  const handleSaveCoach = () => {
    if (!selectedBooking) return;
    setCoachLoading(true);
    axiosClient.put(`/bookings/${selectedBooking.id}`, {
      coach_id: selectedCoachId || null
    })
      .then(() => {
        toast.success('Đã phân công huấn luyện viên thành công!');
        setShowCoachModal(false);
        setSelectedBooking(null);
        fetchBookings();
      })
      .catch(err => {
        console.error("Lỗi khi phân công HLV:", err);
        toast.error('Không thể phân công huấn luyện viên.');
      })
      .finally(() => {
        setCoachLoading(false);
      });
  };

  const getStatusBadge = (status, bookingStatus) => {
    if (bookingStatus === 'Chờ duyệt hủy') {
      return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">Chờ duyệt hủy</span>;
    }
    if (bookingStatus === 'cancelled') {
      return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã hủy</span>;
    }
    switch (status) {
      case 'paid':
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã duyệt</span>;
      case 'refunded':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Hoàn trả</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Thất bại</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Chờ duyệt</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn Đặt Sân</h1>
        <button onClick={fetchBookings} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Tải lại
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 bg-white rounded-xl border border-gray-100 h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-green-600 mb-2">sync</span>
          <span className="text-gray-500 font-medium text-sm">Đang tải dữ liệu đơn đặt sân...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 h-64 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-red-300 block mb-2">error</span>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 h-64 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">calendar_today</span>
          <p className="text-gray-500">Chưa có lượt đặt sân nào được ghi nhận.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Mã Đơn</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Sân / HLV</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-500">#BK00{booking.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{booking.user?.name || 'Khách vãng lai'}</div>
                      <div className="text-xs text-gray-400 font-light">{booking.user?.phone || 'Chưa cập nhật SĐT'}</div>
                      {booking.status === 'Chờ duyệt hủy' && booking.notes && (
                        <div className="text-xs text-red-600 mt-1 italic font-medium max-w-xs truncate" title={booking.notes}>
                          Lý do hủy: {booking.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {booking.court && booking.court.name}
                      {booking.court && booking.coach && ' + '}
                      {booking.coach && `HLV: ${booking.coach.name}`}
                      {!booking.court && !booking.coach && 'Sân mẫu'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-semibold text-gray-800">{booking.start_time} - {booking.end_time}</div>
                      <div className="text-xs text-gray-400 font-light">{booking.booking_date}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-green-600 text-sm">
                      {Number(booking.total_price).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(booking.payment_status, booking.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        {booking.payment_status === 'pending' && (
                          <button 
                            onClick={() => handleTriggerApprove(booking.id)} 
                            className="text-green-600 hover:text-green-800 flex items-center p-1 bg-green-50 rounded hover:bg-green-100 transition cursor-pointer border-0"
                            title="Phê duyệt đơn"
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEditModal(booking)}
                          className="text-amber-600 hover:text-amber-800 flex items-center p-1 bg-amber-50 rounded hover:bg-amber-100 transition cursor-pointer border-0"
                          title="Chỉnh sửa đơn"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={() => handleTriggerAssignCoach(booking)}
                          className="text-blue-600 hover:text-blue-800 flex items-center p-1 bg-blue-50 rounded hover:bg-blue-100 transition cursor-pointer border-0"
                          title="Phân công HLV"
                        >
                          <span className="material-symbols-outlined text-[18px]">sports</span>
                        </button>
                        <button 
                          onClick={() => handleTriggerCancel(booking.id)}
                          className="text-red-500 hover:text-red-700 flex items-center p-1 bg-red-50 rounded hover:bg-red-100 transition cursor-pointer border-0"
                          title="Hủy đơn đặt"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* MODAL XÁC NHẬN PHÊ DUYỆT / HỦY ĐƠN ĐẶT SÂN CHUYÊN NGHIỆP */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className={`px-6 py-5 border-b border-gray-100 flex justify-between items-center ${confirmModal.color === 'green' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`flex items-center gap-2 ${confirmModal.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                <span className="material-symbols-outlined text-2xl">
                  {confirmModal.color === 'green' ? 'check_circle' : 'warning'}
                </span>
                <h2 className="text-lg font-black">{confirmModal.title}</h2>
              </div>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleExecuteConfirm}
                  className={`px-6 py-2.5 text-white font-bold rounded-xl transition shadow-md ${confirmModal.color === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PHÂN CÔNG HUẤN LUYỆN VIÊN */}
      {showCoachModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div className="flex items-center gap-2 text-blue-600">
                <span className="material-symbols-outlined text-2xl">sports</span>
                <h2 className="text-lg font-black">Phân Công Huấn Luyện Viên</h2>
              </div>
              <button 
                onClick={() => { setShowCoachModal(false); setSelectedBooking(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl text-xs text-gray-600 space-y-1.5 border border-gray-100">
                <div><strong>Đơn đặt:</strong> #BK00{selectedBooking.id}</div>
                <div><strong>Khách hàng:</strong> {selectedBooking.user?.name || 'Khách vãng lai'}</div>
                <div><strong>Sân hiện tại:</strong> {selectedBooking.court?.name || 'Không đặt sân'}</div>
                <div><strong>Thời gian:</strong> {selectedBooking.start_time} - {selectedBooking.end_time} ({selectedBooking.booking_date})</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chọn Huấn Luyện Viên</label>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-gray-700"
                >
                  <option value="">-- Không gán HLV (Hoặc hủy gán) --</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowCoachModal(false); setSelectedBooking(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSaveCoach}
                  disabled={coachLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center min-w-[120px]"
                >
                  {coachLoading ? <span className="material-symbols-outlined animate-spin text-sm">autorenew</span> : 'Lưu phân công'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA ĐƠN ĐẶT SÂN / DUYỆT HỦY CHI TIẾT */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 my-8">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <div className="flex items-center gap-2 text-amber-700">
                <span className="material-symbols-outlined text-2xl">edit_calendar</span>
                <h2 className="text-lg font-black">Chỉnh Sửa Lịch Đặt Sân #BK00{editingBooking.id}</h2>
              </div>
              <button 
                onClick={() => { setShowEditModal(false); setEditingBooking(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ngày chơi *</label>
                  <input 
                    type="date"
                    required
                    value={editForm.booking_date}
                    onChange={e => setEditForm({ ...editForm, booking_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sân chơi</label>
                  <select
                    value={editForm.court_id}
                    onChange={e => setEditForm({ ...editForm, court_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  >
                    <option value="">-- Không chọn sân --</option>
                    {courts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giờ bắt đầu *</label>
                  <input 
                    type="time"
                    required
                    value={editForm.start_time.substring(0, 5)}
                    onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giờ kết thúc *</label>
                  <input 
                    type="time"
                    required
                    value={editForm.end_time.substring(0, 5)}
                    onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Huấn luyện viên gán kèm</label>
                <select
                  value={editForm.coach_id}
                  onChange={e => setEditForm({ ...editForm, coach_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                >
                  <option value="">-- Không gán HLV --</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trạng thái đơn *</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  >
                    <option value="pending">Chờ duyệt</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="completed">Đã hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="Chờ duyệt hủy">Chờ duyệt hủy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thanh toán *</label>
                  <select
                    value={editForm.payment_status}
                    onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700"
                  >
                    <option value="pending">Chờ thanh toán</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="refunded">Đã hoàn trả tiền</option>
                    <option value="failed">Thất bại</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi chú lý do / Hủy lịch</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Nhập ghi chú hoặc lý do thay đổi..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold text-gray-700 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingBooking(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition text-sm"
                >
                  Đóng
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center min-w-[120px] text-sm"
                >
                  {editLoading ? <span className="material-symbols-outlined animate-spin text-sm">autorenew</span> : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBookings;
