import { useState, useEffect } from 'react';
import axios from 'axios';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

const DEFAULT_SLOTS = ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];

const ManageCourts = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Modal Xem lịch đặt sân theo ngày
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedCourtForBookings, setSelectedCourtForBookings] = useState(null);
  const [selectedDateForBookings, setSelectedDateForBookings] = useState(new Date().toISOString().split('T')[0]);
  const [courtBookings, setCourtBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourtId, setCurrentCourtId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'outdoor',
    price_per_hour: '',
    status: 'active',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1622228837651-7ef17290538a?q=80&w=800&auto=format&fit=crop',
    slots: DEFAULT_SLOTS
  });

  // Modal Xác nhận xóa sân bảo mật
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState(null);

  // Modal Thiết Lập Bảo Trì Sân
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceCourt, setMaintenanceCourt] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_start_date: '',
    maintenance_end_date: '',
    maintenance_reason: ''
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const fetchCourts = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/courts')
      .then(res => {
        setCourts(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchCourtBookings = async (courtId, dateStr) => {
    setBookingsLoading(true);
    try {
      const response = await axiosClient.get('/bookings');
      if (response.data && response.data.data) {
        const allBookings = response.data.data;
        const courtIdNum = Number(courtId);
        const filtered = allBookings.filter(b => {
          const matchCourt = Number(b.court_id) === courtIdNum || b.court?.id === courtIdNum;
          const bDate = b.booking_date ? b.booking_date.split('T')[0] : (b.created_at ? b.created_at.split('T')[0] : '');
          const matchDate = !dateStr || bDate === dateStr;
          return matchCourt && matchDate;
        });
        setCourtBookings(filtered);
      }
    } catch (err) {
      console.error("Lỗi lấy lịch đặt sân:", err);
      toast.error('Không thể lấy danh sách đơn đặt sân.');
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleOpenCourtBookings = (court) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedCourtForBookings(court);
    setSelectedDateForBookings(todayStr);
    setShowBookingsModal(true);
    fetchCourtBookings(court.id, todayStr);
  };

  const handleDateChangeForBookings = (newDate) => {
    setSelectedDateForBookings(newDate);
    if (selectedCourtForBookings) {
      fetchCourtBookings(selectedCourtForBookings.id, newDate);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      type: 'outdoor',
      price_per_hour: '',
      status: 'active',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1622228837651-7ef17290538a?q=80&w=800&auto=format&fit=crop',
      slots: DEFAULT_SLOTS
    });
    setShowModal(true);
  };

  const openEditModal = (court) => {
    setIsEditing(true);
    setCurrentCourtId(court.id);
    setFormData({
      name: court.name,
      type: court.type === 'trong-nha' ? 'indoor' : court.type,
      price_per_hour: court.price_per_hour,
      status: court.status || 'active',
      description: court.description || '',
      image_url: court.image_url || 'https://images.unsplash.com/photo-1622228837651-7ef17290538a?q=80&w=800&auto=format&fit=crop',
      slots: court.slots || DEFAULT_SLOTS
    });
    setShowModal(true);
  };

  const openMaintenanceModal = (court) => {
    setMaintenanceCourt(court);
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 3);

    const formatD = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    };

    setMaintenanceForm({
      maintenance_start_date: court.maintenance_start_date || formatD(today),
      maintenance_end_date: court.maintenance_end_date || formatD(future),
      maintenance_reason: court.maintenance_reason || 'Bảo trì sửa chữa mặt thảm sân và nâng cấp hệ thống đèn LED'
    });
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenance = (e) => {
    e.preventDefault();
    if (!maintenanceCourt) return;
    setMaintenanceLoading(true);

    axios.put(`http://127.0.0.1:8000/api/courts/${maintenanceCourt.id}`, {
      status: 'maintenance',
      maintenance_start_date: maintenanceForm.maintenance_start_date,
      maintenance_end_date: maintenanceForm.maintenance_end_date,
      maintenance_reason: maintenanceForm.maintenance_reason
    })
    .then((res) => {
      toast.success(res.data.message || 'Thiết lập bảo trì sân thành công!');
      setShowMaintenanceModal(false);
      setMaintenanceCourt(null);
      fetchCourts();
    })
    .catch(err => {
      console.error("Lỗi thiết lập bảo trì sân:", err);
      const errMsg = err.response?.data?.message || 'Không thể bảo trì do sân đang có khách đặt trong thời gian này. Vui lòng dời lịch khách hoặc hủy đơn trước khi thiết lập bảo trì.';
      toast.error(errMsg);
    })
    .finally(() => {
      setMaintenanceLoading(false);
    });
  };

  const handleEndMaintenance = (court) => {
    axios.put(`http://127.0.0.1:8000/api/courts/${court.id}`, {
      status: 'active'
    })
    .then(() => {
      toast.success(`Đã kết thúc bảo trì và kích hoạt lại sân "${court.name}"!`);
      fetchCourts();
    })
    .catch(err => toast.error('Lỗi khi cập nhật trạng thái sân.'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      axios.put(`http://127.0.0.1:8000/api/courts/${currentCourtId}`, formData)
        .then(() => {
          toast.success('Cập nhật sân thành công!');
          setShowModal(false);
          fetchCourts();
        })
        .catch(err => toast.error('Lỗi khi cập nhật sân.'));
    } else {
      axios.post('http://127.0.0.1:8000/api/courts', formData)
        .then(() => {
          toast.success('Thêm sân mới thành công!');
          setShowModal(false);
          fetchCourts();
        })
        .catch(err => toast.error('Lỗi khi thêm sân.'));
    }
  };

  const handleTriggerDelete = (court) => {
    setCourtToDelete(court);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!courtToDelete) return;
    axios.delete(`http://127.0.0.1:8000/api/courts/${courtToDelete.id}`)
      .then(() => {
        toast.success(`Xóa sân "${courtToDelete.name}" thành công!`);
        setShowDeleteModal(false);
        setCourtToDelete(null);
        fetchCourts();
      })
      .catch(err => toast.error('Lỗi khi xóa sân.'));
  };

  // Sorting State
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCourts = (() => {
    if (!sortField) return courts;
    return [...courts].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

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

  const renderSortHeader = (label, field, className = "") => (
    <th 
      onClick={() => handleSort(field)} 
      className={`px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition select-none group ${className}`}
      title={`Bấm để sắp xếp theo ${label}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortField === field ? (
          sortDirection === 'asc' 
            ? <span className="material-symbols-outlined text-[16px] text-green-600 font-bold">arrow_upward</span>
            : <span className="material-symbols-outlined text-[16px] text-green-600 font-bold">arrow_downward</span>
        ) : (
          <span className="material-symbols-outlined text-[16px] text-gray-300 opacity-60 group-hover:opacity-100 transition">unfold_more</span>
        )}
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Sân</h1>
        <button onClick={openAddModal} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 transition shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm sân mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {renderSortHeader('ID', 'id')}
                {renderSortHeader('Tên sân', 'name')}
                {renderSortHeader('Loại sân', 'type')}
                {renderSortHeader('Giá / Giờ', 'price_per_hour')}
                {renderSortHeader('Trạng thái', 'status')}
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10">Đang tải dữ liệu...</td></tr>
              ) : sortedCourts.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10">Chưa có dữ liệu</td></tr>
              ) : (
                sortedCourts.map((court) => (
                  <tr key={court.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-semibold">#{court.id}</td>
                    <td className="px-6 py-4">
                      <button 
                        type="button"
                        onClick={() => handleOpenCourtBookings(court)}
                        className="font-bold text-gray-900 hover:text-green-600 transition flex items-center gap-1.5 group text-left cursor-pointer border-0 bg-transparent p-0"
                        title="Nhấn để xem danh sách đơn đặt sân của sân này"
                      >
                        <span>{court.name}</span>
                        <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-green-600 group-hover:scale-110 transition-transform">calendar_month</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        court.type === 'trong-nha' || court.type === 'indoor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {court.type === 'trong-nha' || court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-green-600 font-bold">{Number(court.price_per_hour).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-4">
                      {court.status === 'maintenance' ? (
                        <div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">construction</span>
                            Đang bảo trì
                          </span>
                          {court.maintenance_start_date && court.maintenance_end_date && (
                            <div className="text-[10px] text-gray-500 font-medium mt-1">
                              📅 {court.maintenance_start_date} ➔ {court.maintenance_end_date}
                            </div>
                          )}
                        </div>
                      ) : court.status === 'inactive' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                          Ngưng hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {/* Nút Xem Lịch Đặt Sân */}
                      <button
                        type="button"
                        onClick={() => handleOpenCourtBookings(court)}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-bold transition inline-flex items-center gap-1 cursor-pointer mr-2 shadow-sm"
                        title="Xem danh sách đơn đặt sân trong ngày"
                      >
                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                        Xem lịch đặt
                      </button>

                      {court.status === 'maintenance' ? (
                        <button 
                          onClick={() => handleEndMaintenance(court)} 
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg mr-2 transition cursor-pointer"
                          title="Hoàn tất bảo trì"
                        >
                          Xong bảo trì
                        </button>
                      ) : (
                        <button 
                          onClick={() => openMaintenanceModal(court)} 
                          className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-lg mr-2 transition cursor-pointer"
                          title="Thiết lập bảo trì sân"
                        >
                          Bảo trì
                        </button>
                      )}
                      <button onClick={() => openEditModal(court)} className="text-blue-500 hover:text-blue-700 mr-2" title="Sửa">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleTriggerDelete(court)} className="text-red-500 hover:text-red-700" title="Xóa">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM / SỬA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Cập nhật thông tin Sân' : 'Thêm Sân Mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sân</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500" 
                  placeholder="VD: Sân VIP 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại sân</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500"
                  >
                    <option value="indoor">Trong nhà</option>
                    <option value="outdoor">Ngoài trời</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá mỗi giờ (VNĐ)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({...formData, price_per_hour: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500" 
                    placeholder="VD: 150000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Ảnh minh họa (URL)</label>
                <input 
                  type="text" 
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500 text-sm" 
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Các khung giờ hoạt động (Giờ bắt đầu)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {DEFAULT_SLOTS.map(t => {
                    const isChecked = (formData.slots || []).includes(t);
                    return (
                      <label 
                        key={t}
                        className={`flex items-center justify-center py-2 px-1 text-xs font-semibold rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-green-50 border-green-500 text-green-700 font-extrabold shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let newSlots = [...(formData.slots || [])];
                            if (e.target.checked) {
                              if (!newSlots.includes(t)) newSlots.push(t);
                            } else {
                              newSlots = newSlots.filter(s => s !== t);
                            }
                            newSlots.sort();
                            setFormData({...formData, slots: newSlots});
                          }}
                          className="hidden"
                        />
                        <span>{t}</span>
                      </label>
                    );
                  })}
                  {/* Custom slots */}
                  {(formData.slots || []).filter(t => !DEFAULT_SLOTS.includes(t)).map(t => (
                    <div 
                      key={t}
                      className="flex items-center justify-between py-2 px-2 text-xs font-bold rounded-xl border bg-green-50 border-green-500 text-green-700 shadow-sm"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newSlots = (formData.slots || []).filter(s => s !== t);
                          setFormData({...formData, slots: newSlots});
                        }}
                        className="text-red-500 hover:text-red-700 flex items-center bg-transparent border-0 cursor-pointer ml-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    id="custom-slot-input"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500 w-28"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('custom-slot-input');
                      if (input && input.value) {
                        const newTime = input.value;
                        if (!(formData.slots || []).includes(newTime)) {
                          const newSlots = [...(formData.slots || []), newTime].sort();
                          setFormData({...formData, slots: newSlots});  
                          toast.error('Không thể thêm giờ vì trùng với giờ đã chọn');
                        }
                        input.value = '';
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer border-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Thêm giờ khác
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả thêm (Tùy chọn)</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500"
                  placeholder="Mô tả về sân..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                  {isEditing ? 'Lưu thay đổi' : 'Thêm Sân'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA SÂN CHUYÊN NGHIỆP */}
      {showDeleteModal && courtToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h2 className="text-lg font-black">Xác Nhận Xóa Sân</h2>
              </div>
              <button 
                onClick={() => { setShowDeleteModal(false); setCourtToDelete(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn sân <strong className="text-gray-900 font-bold">{courtToDelete.name}</strong> khỏi hệ thống? 
                <br />
                <span className="text-red-500 font-semibold mt-2 block">⚠️ Lưu ý: Hành động này là vĩnh viễn và không thể hoàn tác!</span>
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteModal(false); setCourtToDelete(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md"
                >
                  Xóa sân
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THIẾT LẬP BẢO TRÌ SÂN CHUYÊN NGHIỆP */}
      {showMaintenanceModal && maintenanceCourt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <div className="flex items-center gap-2 text-amber-800">
                <span className="material-symbols-outlined text-2xl">construction</span>
                <h2 className="text-lg font-extrabold">Thiết Lập Bảo Trì Sân</h2>
              </div>
              <button 
                onClick={() => { setShowMaintenanceModal(false); setMaintenanceCourt(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveMaintenance} className="p-6 space-y-5">
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  📌 <strong>Sân được chọn:</strong> <span className="font-bold text-gray-900">{maintenanceCourt.name}</span>
                  <br />
                  Hệ thống sẽ đối chiếu và tự động khóa các khung giờ chơi trong khoảng thời gian này.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    1. Ngày bắt đầu sửa chữa
                  </label>
                  <input 
                    type="date"
                    required
                    value={maintenanceForm.maintenance_start_date}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, maintenance_start_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    2. Ngày kết thúc sửa chữa
                  </label>
                  <input 
                    type="date"
                    required
                    min={maintenanceForm.maintenance_start_date}
                    value={maintenanceForm.maintenance_end_date}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, maintenance_end_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  3. Ghi chú lý do bảo trì
                </label>
                <textarea 
                  rows="3"
                  required
                  value={maintenanceForm.maintenance_reason}
                  onChange={(e) => setMaintenanceForm({...maintenanceForm, maintenance_reason: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 text-gray-700"
                  placeholder="VD: Sân có dấu hiệu xuống cấp thảm Acrylic, tiến hành sơn sửa lại..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowMaintenanceModal(false); setMaintenanceCourt(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={maintenanceLoading}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl transition shadow-md flex items-center gap-2 text-xs border-0 cursor-pointer"
                >
                  {maintenanceLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                      Đang kiểm tra đối chiếu...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Xác nhận Kích hoạt Bảo trì
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT ĐƠN ĐẶT SÂN THEO NGÀY */}
      {showBookingsModal && selectedCourtForBookings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-2xl">sports_baseball</span>
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{selectedCourtForBookings.name} — Lịch Đặt Sân</h2>
                  <p className="text-xs text-blue-100">Xem và quản lý tất cả ca chơi đang có trong ngày</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Bộ chọn Ngày */}
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl border border-white/30 text-xs font-bold">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  <span>Chọn ngày:</span>
                  <input 
                    type="date"
                    value={selectedDateForBookings}
                    onChange={(e) => handleDateChangeForBookings(e.target.value)}
                    className="bg-white text-gray-900 px-2 py-1 rounded-lg border-0 outline-none text-xs font-bold cursor-pointer"
                  />
                </div>

                <button 
                  onClick={() => setShowBookingsModal(false)}
                  className="text-white/80 hover:text-white transition p-1 bg-transparent border-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>
            </div>

            {/* Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              
              {/* Sơ đồ Khung giờ trong ngày (Slot status map) */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-blue-600">schedule</span>
                  Trạng thái Ca chơi ({selectedDateForBookings}):
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {DEFAULT_SLOTS.map((slot) => {
                    const matchedBooking = courtBookings.find(b => {
                      const bStart = b.start_time || '';
                      return bStart.startsWith(slot);
                    });

                    let slotStatusClass = "bg-green-100 text-green-800 border-green-200";
                    let slotStatusText = "Còn trống";

                    if (matchedBooking) {
                      if (matchedBooking.status === 'completed' || matchedBooking.status === 'confirmed' || matchedBooking.payment_status === 'paid') {
                        slotStatusClass = "bg-blue-600 text-white border-blue-700 font-bold shadow-xs";
                        slotStatusText = matchedBooking.user?.name || "Đã duyệt";
                      } else if (matchedBooking.status === 'cancelled') {
                        slotStatusClass = "bg-gray-100 text-gray-400 border-gray-200 line-through";
                        slotStatusText = "Đã hủy";
                      } else {
                        slotStatusClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                        slotStatusText = "Chờ duyệt";
                      }
                    }

                    return (
                      <div key={slot} className={`p-2.5 rounded-xl border text-center transition-all ${slotStatusClass}`}>
                        <div className="text-xs font-extrabold">{slot}</div>
                        <div className="text-[10px] truncate mt-0.5">{slotStatusText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danh sách đơn đặt chi tiết */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-blue-600">list_alt</span>
                  Danh sách đơn đặt chi tiết ({courtBookings.length} đơn):
                </h3>

                {bookingsLoading ? (
                  <div className="flex justify-center items-center py-12 text-gray-400 text-sm">
                    <span className="material-symbols-outlined animate-spin text-2xl text-blue-600 mr-2">sync</span>
                    Đang tải dữ liệu đơn đặt...
                  </div>
                ) : courtBookings.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-gray-300">event_available</span>
                    <p className="text-sm font-medium">Chưa có lượt đặt sân nào trong ngày {selectedDateForBookings}.</p>
                    <p className="text-xs text-gray-400 mt-1">Sân hiện đang trống toàn bộ các ca chơi.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-bold text-xs uppercase">Mã Đơn</th>
                          <th className="px-4 py-3 font-bold text-xs uppercase">Khách Hàng</th>
                          <th className="px-4 py-3 font-bold text-xs uppercase">Khung Giờ</th>
                          <th className="px-4 py-3 font-bold text-xs uppercase">HLV</th>
                          <th className="px-4 py-3 font-bold text-xs uppercase">Tổng Tiền</th>
                          <th className="px-4 py-3 font-bold text-xs uppercase text-right">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {courtBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-4 py-3 font-bold text-gray-900">#BK00{b.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-gray-800">{b.user?.name || 'Khách vãng lai'}</div>
                              <div className="text-xs text-gray-400">{b.user?.phone || 'Chưa cập nhật SĐT'}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-blue-700 text-xs">
                              {b.start_time} - {b.end_time}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                              {b.coach?.name ? (
                                <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                                  <span className="material-symbols-outlined text-[14px]">sports</span>
                                  {b.coach.name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Không</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-extrabold text-green-600">
                              {Number(b.total_price || 0).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-3 text-right">
                              {b.status === 'completed' ? (
                                <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold">Hoàn thành</span>
                              ) : b.status === 'cancelled' ? (
                                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">Đã hủy</span>
                              ) : b.status === 'confirmed' || b.payment_status === 'paid' ? (
                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">Đã cọc</span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">Chờ duyệt</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-500 font-medium">
                Hiển thị dữ liệu ca sân trong ngày <strong>{selectedDateForBookings}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowBookingsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourts;
