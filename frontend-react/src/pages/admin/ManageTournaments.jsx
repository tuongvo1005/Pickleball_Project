import { useState, useEffect } from 'react';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

const ManageTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]); // Danh sách user hệ thống để thêm thủ công
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null); // Chi tiết người đăng ký
  const toast = useToast();

  // Search & Lọc giải đấu
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Search người tham gia bên trong modal
  const [searchParticipantQuery, setSearchParticipantQuery] = useState('');
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  
  const [addingParticipantLoading, setAddingParticipantLoading] = useState(false);
  const [removingParticipantLoading, setRemovingParticipantLoading] = useState(false);

  // Modal Thêm/Sửa giải đấu
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: '',
    prize: '',
    status: 'upcoming',
  });

  // Modal Xác nhận xóa giải đấu bảo mật (Thay thế window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [errors, setErrors] = useState({});

  // Lấy danh sách giải đấu bằng axiosClient
  const fetchTournaments = () => {
    setLoading(true);
    axiosClient.get('/tournaments')
      .then(res => {
        setTournaments(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy giải đấu:", err);
        toast.error('Không thể lấy danh sách giải đấu.');
        setLoading(false);
      });
  };

  // Lấy danh sách user để chọn thêm thủ công
  const fetchUsers = () => {
    axiosClient.get('/admin/users')
      .then(res => {
        if (res.data.success) {
          setUsers(res.data.data || []);
        }
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách user:", err);
      });
  };

  useEffect(() => {
    fetchTournaments();
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ name: '', description: '', start_date: '', end_date: '', location: '', max_participants: '', prize: '', status: 'upcoming' });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setIsEditing(true);
    setCurrentId(t.id);
    setFormData({
      name: t.name || '',
      description: t.description || '',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      location: t.location || '',
      max_participants: t.max_participants || '',
      prize: t.prize || '',
      status: t.status || 'upcoming',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Frontend validation
    const localErrors = {};
    if (!formData.name) localErrors.name = ['Tên giải đấu không được để trống'];
    if (!formData.start_date) localErrors.start_date = ['Ngày bắt đầu không được để trống'];
    if (!formData.end_date) localErrors.end_date = ['Ngày kết thúc không được để trống'];
    
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      localErrors.end_date = ['Ngày kết thúc không được diễn ra trước Ngày bắt đầu'];
    }
    
    if (formData.max_participants !== '' && Number(formData.max_participants) < 0) {
      localErrors.max_participants = ['Số lượng người tham gia tối đa không được là số âm'];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      toast.error('Dữ liệu nhập vào không hợp lệ!');
      return;
    }

    if (isEditing) {
      axiosClient.put(`/tournaments/${currentId}`, formData)
        .then(() => {
          toast.success('Cập nhật giải đấu thành công!');
          setShowModal(false);
          fetchTournaments();
        })
        .catch(err => {
          console.error(err);
          if (err.response && err.response.status === 422) {
            setErrors(err.response.data.errors || {});
            toast.error('Dữ liệu nhập vào không hợp lệ!');
          } else {
            toast.error('Lỗi khi cập nhật giải đấu.');
          }
        });
    } else {
      axiosClient.post('/tournaments', formData)
        .then(() => {
          toast.success('Thêm giải đấu mới thành công!');
          setShowModal(false);
          fetchTournaments();
        })
        .catch(err => {
          console.error(err);
          if (err.response && err.response.status === 422) {
            setErrors(err.response.data.errors || {});
            toast.error('Dữ liệu nhập vào không hợp lệ!');
          } else {
            toast.error('Lỗi khi thêm giải đấu.');
          }
        });
    }
  };

  const handleTriggerDelete = (tournament) => {
    setTournamentToDelete(tournament);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!tournamentToDelete) return;
    axiosClient.delete(`/tournaments/${tournamentToDelete.id}`)
      .then(() => {
        toast.success(`Xóa giải đấu "${tournamentToDelete.name}" thành công!`);
        setShowDeleteModal(false);
        setTournamentToDelete(null);
        fetchTournaments();
      })
      .catch(() => toast.error('Lỗi khi xóa giải đấu.'));
  };

  // Mở danh sách người đăng ký tham gia giải đấu
  const openParticipants = (tournament) => {
    setSelectedTournament(tournament);
    setSelectedParticipant(null); // reset
    setSearchParticipantQuery('');
    setSelectedUserIdToAdd('');
    setShowAddPlayerForm(false);
    setLoadingParticipants(true);
    axiosClient.get(`/tournaments/${tournament.id}`)
      .then(res => {
        setParticipants(res.data.data?.participants || []);
        setLoadingParticipants(false);
      })
      .catch(() => {
        toast.error('Không thể tải danh sách người tham gia.');
        setLoadingParticipants(false);
      });
  };

  // Thêm vận động viên thủ công
  const handleAddParticipant = async () => {
    if (!selectedUserIdToAdd || !selectedTournament) return;
    setAddingParticipantLoading(true);
    try {
      const response = await axiosClient.post(`/tournaments/${selectedTournament.id}/join`, {
        user_id: selectedUserIdToAdd
      });
      if (response.data.success) {
        toast.success('Đăng ký vận động viên thành công!');
        // Refresh danh sách người tham gia
        const updatedRes = await axiosClient.get(`/tournaments/${selectedTournament.id}`);
        setParticipants(updatedRes.data.data?.participants || []);
        
        // Cập nhật số người tham gia cục bộ trên danh sách giải đấu
        setTournaments(prev => prev.map(t => 
          t.id === selectedTournament.id 
            ? { ...t, participants_count: (t.participants_count || 0) + 1 }
            : t
        ));
        setSelectedUserIdToAdd('');
        setShowAddPlayerForm(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi khi thêm vận động viên.');
    } finally {
      setAddingParticipantLoading(false);
    }
  };

  // Xóa vận động viên khỏi giải đấu
  const handleRemoveParticipant = async (userId, userName) => {
    if (!selectedTournament) return;
    const confirmRemove = window.confirm(`Bạn có chắc chắn muốn hủy đăng ký của VĐV ${userName} khỏi giải đấu này?`);
    if (!confirmRemove) return;

    setRemovingParticipantLoading(true);
    try {
      const response = await axiosClient.delete(`/tournaments/${selectedTournament.id}/remove-participant`, {
        data: { user_id: userId }
      });
      if (response.data.success) {
        toast.success(`Đã hủy đăng ký của VĐV ${userName}!`);
        // Refresh danh sách người tham gia
        const updatedRes = await axiosClient.get(`/tournaments/${selectedTournament.id}`);
        setParticipants(updatedRes.data.data?.participants || []);
        
        // Cập nhật số lượng cục bộ trên danh sách giải đấu
        setTournaments(prev => prev.map(t => 
          t.id === selectedTournament.id 
            ? { ...t, participants_count: Math.max(0, (t.participants_count || 1) - 1) }
            : t
        ));
        setSelectedParticipant(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi khi hủy đăng ký.');
    } finally {
      setRemovingParticipantLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">Đang diễn ra</span>;
      case 'finished':
        return <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-xs font-bold">Đã kết thúc</span>;
      default:
        return <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold">Sắp diễn ra</span>;
    }
  };

  // Lọc giải đấu
  const filteredTournaments = tournaments.filter(t => {
    const matchSearch = t.name ? t.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Lọc danh sách người đăng ký bên trong Modal
  const filteredParticipants = participants.filter(p => {
    const nameMatch = p.name ? p.name.toLowerCase().includes(searchParticipantQuery.toLowerCase()) : false;
    const emailMatch = p.email ? p.email.toLowerCase().includes(searchParticipantQuery.toLowerCase()) : false;
    return nameMatch || emailMatch;
  });

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

  const sortedFilteredTournaments = (() => {
    if (!sortField) return filteredTournaments;
    return [...filteredTournaments].sort((a, b) => {
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

  const renderSortHeader = (label, field, align = "text-left") => (
    <th 
      onClick={() => handleSort(field)} 
      className={`px-6 py-4 font-bold text-gray-700 cursor-pointer hover:bg-gray-100 transition select-none group ${align}`}
      title={`Bấm để sắp xếp theo ${label}`}
    >
      <div className={`flex items-center gap-1 ${align === 'text-center' ? 'justify-center' : ''}`}>
        <span>{label}</span>
        {sortField === field ? (
          sortDirection === 'asc' 
            ? <span className="material-symbols-outlined text-[15px] text-orange-500 font-bold">arrow_upward</span>
            : <span className="material-symbols-outlined text-[15px] text-orange-500 font-bold">arrow_downward</span>
        ) : (
          <span className="material-symbols-outlined text-[15px] text-gray-300 opacity-60 group-hover:opacity-100 transition">unfold_more</span>
        )}
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Giải Đấu</h1>
        <button
          onClick={openAddModal}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-orange-600 flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Thêm giải đấu
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Bộ lọc giải đấu */}
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
          <input 
            type="text" 
            placeholder="Tìm kiếm giải đấu theo tên..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" 
          />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all bg-white font-semibold"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="ongoing">Đang diễn ra</option>
            <option value="finished">Đã kết thúc</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-3 block">emoji_events</span>
            <p className="font-medium">Không tìm thấy giải đấu nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {renderSortHeader('Tên giải đấu', 'name', 'text-left')}
                  {renderSortHeader('Thời gian', 'start_date', 'text-left')}
                  {renderSortHeader('Đã đăng ký', 'participants_count', 'text-center')}
                  {renderSortHeader('Trạng thái', 'status', 'text-center')}
                  <th className="px-6 py-4 text-center font-bold text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedFilteredTournaments.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-400">Bắt đầu:</span>
                        <span>{t.start_date ? new Date(t.start_date).toLocaleDateString('vi-VN') : '—'}</span>
                        <span className="text-xs text-gray-400 mt-1">Kết thúc:</span>
                        <span>{t.end_date ? new Date(t.end_date).toLocaleDateString('vi-VN') : '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openParticipants(t)}
                        className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 font-bold px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                        {t.participants_count ?? 0} người
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(t.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleTriggerDelete(t)}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Xóa"
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
        )}
      </div>

      {/* Modal Thêm / Sửa giải đấu */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Chỉnh sửa giải đấu' : 'Thêm giải đấu mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên giải đấu *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="VD: Pickleball Open 2026"
                />
                {errors.name && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.name[0]}</span>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 resize-none ${errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  placeholder="Thể lệ, thông tin thêm..."
                />
                {errors.description && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.description[0]}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date" required
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.start_date ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  />
                  {errors.start_date && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.start_date[0]}</span>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ngày kết thúc *</label>
                  <input
                    type="date" required
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.end_date ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  />
                  {errors.end_date && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.end_date[0]}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.location ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="TP. Hồ Chí Minh"
                  />
                  {errors.location && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.location[0]}</span>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giải thưởng</label>
                  <input
                    type="text"
                    value={formData.prize}
                    onChange={e => setFormData({ ...formData, prize: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.prize ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="30.000.000đ"
                  />
                  {errors.prize && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.prize[0]}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số người tối đa</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_participants}
                    onChange={e => setFormData({ ...formData, max_participants: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 ${errors.max_participants ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="64"
                  />
                  {errors.max_participants && <span className="text-red-500 text-xs mt-1 block font-bold">{errors.max_participants[0]}</span>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Trạng thái giải đấu</label>
                  <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <span className="text-xs text-gray-500 font-semibold">Tự động kích hoạt & kết thúc theo Lịch trình</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  Hủy
                </button>
                <button type="submit" className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-md">
                  {isEditing ? 'Lưu thay đổi' : 'Tạo giải đấu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xem danh sách người đăng ký */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">sports_tennis</span>
                  Quản lý Danh Sách Đăng Ký
                </h2>
                <p className="text-sm text-orange-600 font-bold mt-0.5">{selectedTournament.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">{showAddPlayerForm ? 'close' : 'person_add'}</span>
                  {showAddPlayerForm ? 'Hủy đăng ký hộ' : 'Đăng ký hộ VĐV'}
                </button>
                <button onClick={() => { setSelectedTournament(null); setSelectedParticipant(null); }} className="text-gray-400 hover:text-gray-600 transition">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Đăng ký hộ VĐV Form (Dành cho Admin) */}
            {showAddPlayerForm && (
              <div className="bg-orange-50 p-4 border-b border-orange-100 shrink-0 animate-in slide-in-from-top duration-200">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-orange-800 mb-1">Chọn thành viên để đăng ký vào giải đấu này:</label>
                    <select 
                      value={selectedUserIdToAdd}
                      onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                      className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium focus:border-orange-500"
                    >
                      <option value="">-- Click để chọn tài khoản từ hệ thống --</option>
                      {users
                        .filter(u => !participants.some(p => p.id === u.id)) // Ẩn những người đã đăng ký
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - {u.role === 'coach' ? 'Huấn luyện viên' : 'Khách hàng'}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="pt-5">
                    <button 
                      onClick={handleAddParticipant}
                      disabled={addingParticipantLoading || !selectedUserIdToAdd}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {addingParticipantLoading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">person_add</span>
                      )}
                      Xác nhận Thêm
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Thanh tìm kiếm người tham gia trong Modal */}
            <div className="px-6 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm người tham gia theo tên hoặc email..." 
                value={searchParticipantQuery}
                onChange={(e) => setSearchParticipantQuery(e.target.value)}
                className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* Body - hai cột khi chọn người */}
            <div className="flex flex-1 min-h-0 bg-white">
              {/* Cột trái: danh sách */}
              <div className={`overflow-y-auto p-6 transition-all duration-300 ${selectedParticipant ? 'w-1/2 border-r border-gray-100' : 'w-full'}`}>
                {loadingParticipants ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-5xl mb-2 block">person_off</span>
                    <p>Chưa có người đăng ký hoặc không tìm thấy kết quả.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
                      Đã hiển thị: <span className="text-orange-600">{filteredParticipants.length}</span> / {participants.length} VĐV
                    </p>
                    {filteredParticipants.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          selectedParticipant?.id === p.id
                            ? 'border-orange-300 bg-orange-50/50 shadow-sm'
                            : 'border-gray-100 bg-gray-50/60 hover:border-orange-200 hover:bg-orange-50/20'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedParticipant(selectedParticipant?.id === p.id ? null : p)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-gray-900 truncate text-sm">{p.name}</p>
                            <p className="text-xs text-gray-400 truncate">{p.email}</p>
                          </div>
                        </button>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handleRemoveParticipant(p.id, p.name)}
                            disabled={removingParticipantLoading}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                            title="Xóa VĐV này khỏi giải đấu"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                          </button>
                          <button
                            onClick={() => setSelectedParticipant(selectedParticipant?.id === p.id ? null : p)}
                            className={`p-1.5 rounded-lg transition-transform ${selectedParticipant?.id === p.id ? 'text-orange-500 rotate-90' : 'text-gray-300'}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cột phải: chi tiết người được chọn */}
              {selectedParticipant && (
                <div className="w-1/2 overflow-y-auto p-6 bg-gray-50/50 flex flex-col justify-between border-l border-gray-100">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-base font-bold text-gray-900">Thông tin chi tiết VĐV</h3>
                      <button
                        onClick={() => setSelectedParticipant(null)}
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>

                    {/* Avatar & Tên */}
                    <div className="flex flex-col items-center text-center mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-2xl font-bold mb-3 shadow-md">
                        {selectedParticipant.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-gray-900 text-lg">{selectedParticipant.name}</p>
                      <span className="mt-1 text-xs bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full">
                        {selectedParticipant.role === 'admin' ? 'Quản trị viên' : selectedParticipant.role === 'coach' ? 'Huấn luyện viên' : 'Vận động viên'}
                      </span>
                    </div>

                    {/* Thông tin liên hệ */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <span className="material-symbols-outlined text-orange-400 text-[20px] mt-0.5">mail</span>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">Email</p>
                          <p className="text-sm font-semibold text-gray-800 break-all">{selectedParticipant.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <span className="material-symbols-outlined text-orange-400 text-[20px] mt-0.5">phone</span>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">Số điện thoại</p>
                          <p className="text-sm font-semibold text-gray-800">{selectedParticipant.phone || 'Đang cập nhật'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <span className="material-symbols-outlined text-orange-400 text-[20px] mt-0.5">badge</span>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">Mã người dùng</p>
                          <p className="text-sm font-semibold text-gray-800">#UID{String(selectedParticipant.id).padStart(4,'0')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <span className="material-symbols-outlined text-green-500 text-[20px] mt-0.5">check_circle</span>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">Trạng thái</p>
                          <p className="text-sm font-semibold text-green-600">Đã đăng ký thành công</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-gray-100">
                    <button 
                      onClick={() => handleRemoveParticipant(selectedParticipant.id, selectedParticipant.name)}
                      disabled={removingParticipantLoading}
                      className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl text-sm hover:bg-red-100 transition flex items-center justify-center gap-1.5 border border-red-100"
                    >
                      {removingParticipantLoading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">person_remove</span>
                      )}
                      Hủy đăng ký của VĐV này
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA GIẢI ĐẤU CHUYÊN NGHIỆP */}
      {showDeleteModal && tournamentToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h2 className="text-lg font-black">Xác Nhận Xóa Giải Đấu</h2>
              </div>
              <button 
                onClick={() => { setShowDeleteModal(false); setTournamentToDelete(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn giải đấu <strong className="text-gray-900 font-bold">{tournamentToDelete.name}</strong> khỏi hệ thống? 
                <br />
                <span className="text-red-500 font-semibold mt-2 block">⚠️ Lưu ý: Hành động này sẽ xóa toàn bộ danh sách đăng ký của giải đấu này và không thể phục hồi!</span>
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteModal(false); setTournamentToDelete(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md"
                >
                  Xóa giải đấu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTournaments;
