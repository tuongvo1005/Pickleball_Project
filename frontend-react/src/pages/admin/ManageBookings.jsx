import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

const ManageBookings = () => {
  const location = useLocation();
  const [highlightId, setHighlightId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (location.state?.highlightId && bookings.length > 0) {
      const targetId = Number(location.state.highlightId);
      setHighlightId(targetId);
      const targetBooking = bookings.find(b => b.id === targetId);
      if (targetBooking) {
        if (targetBooking.status === 'Chờ duyệt hủy') {
          handleOpenCancelApprovalModal(targetBooking);
        }
      }
      // Tự động cuộn mượt xuống đúng dòng đơn được chọn
      setTimeout(() => {
        const el = document.getElementById(`booking-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [location.state, bookings]);

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

  // Modal Duyệt Hủy đơn từ khách & Thông báo Hoàn tiền
  const [showCancelApprovalModal, setShowCancelApprovalModal] = useState(false);
  const [selectedBookingForCancelApprove, setSelectedBookingForCancelApprove] = useState(null);
  const [cancelApprovalLoading, setCancelApprovalLoading] = useState(false);

  const handleOpenCancelApprovalModal = (booking) => {
    setSelectedBookingForCancelApprove(booking);
    setShowCancelApprovalModal(true);
  };

  const handleApproveCancelSubmit = async () => {
    if (!selectedBookingForCancelApprove) return;
    setCancelApprovalLoading(true);
    try {
      await axiosClient.put(`/bookings/${selectedBookingForCancelApprove.id}`, {
        status: 'cancelled',
        payment_status: 'refunded'
      });
      toast.success(`Đã phê duyệt HỦY đơn #BK00${selectedBookingForCancelApprove.id} và ghi nhận HOÀN TIỀN thành công!`);
      setShowCancelApprovalModal(false);
      setSelectedBookingForCancelApprove(null);
      fetchBookings();
    } catch (err) {
      console.error("Lỗi khi duyệt hủy đơn:", err);
      toast.error('Không thể cập nhật trạng thái hủy đơn.');
    } finally {
      setCancelApprovalLoading(false);
    }
  };

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
      message: 'Bạn có chắc chắn muốn xác nhận đã thu tiền cọc và duyệt thành công đơn đặt sân này không?',
      color: 'green'
    });
  };

  const handleTriggerComplete = (bookingId) => {
    setConfirmModal({
      show: true,
      type: 'complete',
      bookingId,
      title: 'Xác Nhận Đã Hoàn Thành Ca Sân',
      message: 'Bạn có chắc chắn muốn xác nhận khách đã chơi xong và thu đủ 100% tổng tiền đơn đặt sân này không? Doanh thu tổng tiền sẽ được cập nhật đầy đủ.',
      color: 'blue'
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
      axiosClient.put(`/bookings/${bookingId}`, { status: 'confirmed', payment_status: 'paid' })
        .then(() => {
          toast.success('Đã phê duyệt đơn đặt sân thành công!');
          setConfirmModal(prev => ({ ...prev, show: false }));
          fetchBookings();
        })
        .catch(err => {
          console.error("Lỗi khi duyệt đặt sân:", err);
          toast.error('Không thể cập nhật trạng thái đơn đặt sân.');
        });
    } else if (type === 'complete') {
      axiosClient.put(`/bookings/${bookingId}`, { status: 'completed', payment_status: 'paid' })
        .then(() => {
          toast.success('Đã xác nhận đơn Đã Hoàn Thành! 100% tổng tiền đã được tính vào Doanh Thu.');
          setConfirmModal(prev => ({ ...prev, show: false }));
          fetchBookings();
        })
        .catch(err => {
          console.error("Lỗi khi hoàn thành đơn đặt sân:", err);
          toast.error('Không thể xác nhận hoàn thành đơn.');
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
    if (bookingStatus === 'completed') {
      return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã hoàn thành</span>;
    }
    if (bookingStatus === 'Chờ duyệt hủy') {
      return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">Chờ duyệt hủy</span>;
    }
    if (bookingStatus === 'cancelled') {
      return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã hủy</span>;
    }
    if (bookingStatus === 'confirmed') {
      return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã cọc</span>;
    }
    switch (status) {
      case 'paid':
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Đã cọc</span>;
      case 'refunded':
        return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Hoàn trả</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Thất bại</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Chờ duyệt</span>;
    }
  };

  // Search & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id'); // Mặc định sắp xếp theo ID
  const [sortDirection, setSortDirection] = useState('desc'); // Mặc định ĐƠN MỚI NHẤT LÊN ĐẦU

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedBookings = (() => {
    // 1. Lọc theo từ khóa tìm kiếm (Mã đơn, Tên khách, SĐT, Tên sân, Tên HLV)
    let list = bookings;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const rawNum = term.replace(/[^0-9]/g, '');
      
      list = bookings.filter(b => {
        const codeStr = `#bk${String(b.id).padStart(4, '0')}`.toLowerCase();
        const matchCode = codeStr.includes(term) || (rawNum && String(b.id) === rawNum);
        const matchUser = (b.user?.name || '').toLowerCase().includes(term);
        const matchPhone = (b.user?.phone || '').includes(term);
        const matchCourt = (b.court?.name || '').toLowerCase().includes(term);
        const matchCoach = (b.coach?.name || '').toLowerCase().includes(term);
        return matchCode || matchUser || matchPhone || matchCourt || matchCoach;
      });
    }

    // 2. Sắp xếp danh sách
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'user_name') {
        aVal = a.user?.name || '';
        bVal = b.user?.name || '';
      } else if (sortField === 'court_name') {
        aVal = a.court?.name || '';
        bVal = b.court?.name || '';
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal, 'vi') 
          : bVal.localeCompare(aVal, 'vi');
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  })();

  const renderSortHeader = (label, field) => (
    <th 
      onClick={() => handleSort(field)} 
      className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-700 cursor-pointer hover:bg-gray-100 transition select-none group"
      title={`Bấm để sắp xếp theo ${label}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortField === field ? (
          sortDirection === 'asc' 
            ? <span className="material-symbols-outlined text-[15px] text-green-600 font-bold">arrow_upward</span>
            : <span className="material-symbols-outlined text-[15px] text-green-600 font-bold">arrow_downward</span>
        ) : (
          <span className="material-symbols-outlined text-[15px] text-gray-300 opacity-60 group-hover:opacity-100 transition">unfold_more</span>
        )}
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn Đặt Sân</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi và phê duyệt tất cả lịch đặt sân của khách hàng</p>
        </div>
        <button onClick={fetchBookings} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Tải lại
        </button>
      </div>

      {/* Thanh Tìm Kiếm Đơn Đặt Sân */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
            <span className="material-symbols-outlined text-xl">search</span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã đơn (#BK0041), Tên khách hàng, SĐT, Tên sân..."
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 border-0 bg-transparent cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 font-semibold whitespace-nowrap bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200">
          Hiển thị <span className="text-green-600 font-extrabold text-sm">{filteredAndSortedBookings.length}</span> / {bookings.length} đơn đặt
        </div>
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
      ) : filteredAndSortedBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">search_off</span>
          <p className="text-gray-600 font-medium">Không tìm thấy đơn đặt sân nào phù hợp với từ khóa "{searchTerm}".</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 text-xs text-green-600 font-bold hover:underline cursor-pointer border-0 bg-transparent"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {renderSortHeader('Mã Đơn', 'id')}
                  {renderSortHeader('Khách hàng', 'user_name')}
                  {renderSortHeader('Sân / HLV', 'court_name')}
                  {renderSortHeader('Ngày', 'booking_date')}
                  {renderSortHeader('Tổng tiền', 'total_price')}
                  {renderSortHeader('Trạng thái', 'payment_status')}
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right text-gray-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedBookings.map((booking) => (
                  <tr 
                    key={booking.id} 
                    id={`booking-row-${booking.id}`}
                    className={booking.id === highlightId ? "bg-amber-100/90 border-l-4 border-amber-500 font-extrabold shadow-sm transition-all animate-pulse" : "hover:bg-gray-50/50 transition-colors"}
                  >
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
                      <div className="flex justify-end items-center gap-2">
                        {/* Nút DUYỆT HỦY nổi bật cho đơn Chờ duyệt hủy */}
                        {booking.status === 'Chờ duyệt hủy' && (
                          <button 
                            type="button"
                            onClick={() => handleOpenCancelApprovalModal(booking)}
                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shadow-md transition cursor-pointer border-0 mr-1 animate-bounce"
                            title="Bấm để xem SĐT khách và xác nhận hoàn cọc / hủy đơn"
                          >
                            <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                            Duyệt hủy
                          </button>
                        )}
                        {booking.payment_status === 'pending' && booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'Chờ duyệt hủy' && (
                          <button 
                            onClick={() => handleTriggerApprove(booking.id)} 
                            className="text-green-600 hover:text-green-800 flex items-center p-1 bg-green-50 rounded hover:bg-green-100 transition cursor-pointer border-0"
                            title="Phê duyệt đơn (Đã cọc)"
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                        )}
                        {/* ẨN NÚT HOÀN THÀNH CA KHI ĐANG Ở TRẠNG THÁI CHỜ DUYỆT HỦY */}
                        {booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'Chờ duyệt hủy' && (
                          <button 
                            onClick={() => handleTriggerComplete(booking.id)} 
                            className="text-blue-600 hover:text-blue-800 flex items-center p-1 bg-blue-50 rounded hover:bg-blue-100 transition cursor-pointer border-0"
                            title="Xác nhận Đã hoàn thành ca chơi (Tính 100% tổng tiền vào Doanh Thu)"
                          >
                            <span className="material-symbols-outlined text-[18px]">task_alt</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEditModal(booking)}
                          className="text-amber-600 hover:text-amber-800 flex items-center p-1 bg-amber-50 rounded hover:bg-amber-100 transition cursor-pointer border-0"
                          title="Chỉnh sửa đơn"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {/* Nút Hủy/Xóa đơn đặt sân đã được ẩn theo yêu cầu */}
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

      {/* MODAL CẢNH BÁO HOÀN TIỀN & XÁC NHẬN HỦY ĐƠN */}
      {showCancelApprovalModal && selectedBookingForCancelApprove && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            {/* Header */}
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">published_with_changes</span>
                <h3 className="text-lg font-black tracking-tight">Xác Nhận Hủy & Hoàn Cọc Khách Hàng</h3>
              </div>
              <button 
                onClick={() => setShowCancelApprovalModal(false)} 
                className="text-white/80 hover:text-white border-0 bg-transparent cursor-pointer flex items-center p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Thẻ thông tin khách hàng & Yêu cầu */}
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-900 text-sm">
                <div className="flex items-center gap-2 text-red-800 font-extrabold text-base mb-1">
                  <span className="material-symbols-outlined text-xl">warning</span>
                  <span>ĐƠN YÊU CẦU HỦY #{selectedBookingForCancelApprove.id}</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  Khách hàng <strong className="text-red-950 underline">{selectedBookingForCancelApprove.user?.name || 'Khách vãng lai'}</strong> vừa gửi yêu cầu hủy lịch đặt sân.
                </p>
                {selectedBookingForCancelApprove.notes && (
                  <div className="mt-2.5 p-3 bg-white/90 rounded-xl text-xs italic border border-red-200 text-red-900 font-medium">
                    📌 <strong>Lý do từ khách:</strong> {selectedBookingForCancelApprove.notes}
                  </div>
                )}
              </div>

              {/* Ô thông tin liên hệ và nhắc nhở hoàn tiền */}
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-amber-600">contact_phone</span>
                  <span>THÔNG TIN LIÊN HỆ HOÀN TIỀN:</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Số điện thoại khách hàng:</p>
                    <p className="text-base font-black text-gray-900">
                      📞 {selectedBookingForCancelApprove.user?.phone || 'Chưa cập nhật SĐT'}
                    </p>
                  </div>
                  {selectedBookingForCancelApprove.user?.phone && (
                    <a 
                      href={`tel:${selectedBookingForCancelApprove.user.phone}`}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 no-underline shadow-sm transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      Gọi ngay
                    </a>
                  )}
                </div>
                <p className="text-xs text-amber-900 font-bold leading-relaxed pt-1">
                  💡 <strong>Hướng dẫn Admin:</strong> Vui lòng chủ động gọi điện/nhắn tin theo SĐT ở trên để hoàn cọc cho khách. Sau khi đã hoàn tiền thành công, hãy bấm <strong>"Đã hoàn tiền & Duyệt Hủy"</strong> bên dưới.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowCancelApprovalModal(false)}
                className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-xs transition cursor-pointer border-0"
              >
                Để sau
              </button>
              <button 
                type="button"
                onClick={handleApproveCancelSubmit}
                disabled={cancelApprovalLoading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shadow-md flex items-center gap-2 text-xs border-0 cursor-pointer"
              >
                {cancelApprovalLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Đã hoàn tiền & Duyệt Hủy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBookings;
