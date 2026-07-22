import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import axiosClient from '../../axiosClient';

const ManageUsers = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal Thêm người dùng
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: 'password123', role: 'user', phone: '' });

  // Modal Xác nhận cấp quyền bằng mật khẩu
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingChange, setPendingChange] = useState(null); // { userId, userName, currentRole, newRole }
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Modal Xác nhận xóa người dùng bảo mật (Thay thế window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null); // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal Sửa thông tin người dùng / HLV
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    bio: '',
    hourly_rate: '',
    experience: '',
    expertise: '',
    avatar: '',
    admin_password: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Lấy danh sách người dùng thực tế từ Laravel
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách user:", err);
      toast.error('Không thể lấy danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset trang khi lọc hoặc tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  // Kích hoạt hiển thị Modal xác nhận đổi quyền
  const handleTriggerConfirm = (user, newRole) => {
    if (user.role === newRole) return;

    setPendingChange({
      userId: user.id,
      userName: user.name,
      currentRole: user.role,
      newRole: newRole
    });
    setAdminPassword('');
    setShowConfirmModal(true);
  };

  // Xác nhận đổi quyền sau khi Admin nhập đúng mật khẩu
  const handleConfirmRoleChange = async (e) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.warning('Vui lòng nhập mật khẩu xác nhận!');
      return;
    }

    setConfirmLoading(true);
    try {
      const response = await axiosClient.put(`/admin/users/${pendingChange.userId}`, {
        role: pendingChange.newRole,
        admin_password: adminPassword
      });

      if (response.data.success) {
        setUsers(users.map(u => u.id === pendingChange.userId ? { ...u, role: pendingChange.newRole } : u));
        toast.success(`Cấp quyền thành công cho ${pendingChange.userName}!`);
        setShowConfirmModal(false);
        setPendingChange(null);
        setAdminPassword('');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Xác nhận mật khẩu thất bại.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    try {
      const response = await axiosClient.post('/admin/users', newUser);
      if (response.data.success) {
        setUsers([...users, response.data.data]);
        setShowAddModal(false);
        setNewUser({ name: '', email: '', password: 'password123', role: 'user', phone: '' });
        toast.success('Thêm người dùng mới thành công!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể tạo người dùng mới.');
    }
  };

  // Mở modal xác nhận xóa
  const handleTriggerDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Thực thi xóa tài khoản sau khi xác nhận trong Modal
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await axiosClient.delete(`/admin/users/${userToDelete.id}`);
      if (response.data.success) {
        setUsers(users.filter(user => user.id !== userToDelete.id));
        toast.success(`Đã xóa tài khoản ${userToDelete.name} thành công!`);
        setShowDeleteModal(false);
        setUserToDelete(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể xóa người dùng.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Mở modal sửa thông tin người dùng
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'user',
      bio: user.bio || '',
      hourly_rate: user.hourly_rate || '',
      experience: user.experience || '',
      expertise: user.expertise || '',
      avatar: user.avatar || '',
      admin_password: ''
    });
    setShowEditModal(true);
  };

  // Thực thi lưu thông tin đã chỉnh sửa
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.admin_password) {
      toast.warning('Vui lòng nhập mật khẩu Admin để xác nhận!');
      return;
    }
    setEditLoading(true);
    try {
      const response = await axiosClient.put(`/admin/users/${editingUser.id}`, editFormData);
      if (response.data.success) {
        setUsers(users.map(u => u.id === editingUser.id ? response.data.data : u));
        toast.success('Cập nhật thông tin người dùng thành công!');
        setShowEditModal(false);
        setEditingUser(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Cập nhật thông tin thất bại.');
    } finally {
      setEditLoading(false);
    }
  };

  const translateRole = (role) => {
    if (role === 'admin') return 'Quản trị viên (Admin)';
    if (role === 'coach') return 'Huấn luyện viên (Coach)';
    return 'Khách hàng (User)';
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const emailMatch = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchSearch = nameMatch || emailMatch;
    const matchRole = filterRole === 'all' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Người Dùng</h1>
        <button onClick={() => setShowAddModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-sm">person_add</span>
          Thêm người dùng (Admin, User...)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" 
          />
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all bg-white"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="coach">Huấn luyện viên (PT/Coach)</option>
            <option value="user">Khách hàng (User)</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-3xl text-green-600">autorenew</span>
            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tài khoản</th>
                    <th className="px-6 py-4 font-medium">Vai trò</th>
                    <th className="px-6 py-4 font-medium">Số điện thoại</th>
                    <th className="px-6 py-4 font-medium text-right">Thao tác cấp quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-10 text-gray-500">Không tìm thấy người dùng nào phù hợp.</td></tr>
                  ) : (
                    currentItems.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-sm uppercase ${
                                user.role === 'admin' ? 'bg-purple-500' : 
                                user.role === 'coach' ? 'bg-blue-500' : 'bg-gray-400'
                              }`}>
                                {user.name ? user.name.charAt(0) : 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          {user.role === 'admin' && <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[11px] font-bold">Admin</span>}
                          {user.role === 'coach' && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold">Huấn luyện viên</span>}
                          {user.role === 'user' && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[11px] font-bold">Khách hàng</span>}
                        </td>
                        
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {user.phone || 'Chưa cập nhật'}
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <select 
                            value={user.role}
                            onChange={(e) => handleTriggerConfirm(user, e.target.value)}
                            className="border border-gray-200 rounded-lg text-xs px-3 py-1.5 bg-white outline-none mr-3 cursor-pointer hover:border-green-500 transition-colors font-semibold"
                          >
                            <option value="admin">Cấp quyền: Admin</option>
                            <option value="coach">Cấp quyền: PT (Coach)</option>
                            <option value="user">Cấp quyền: User</option>
                          </select>
                          
                          <button 
                            onClick={() => handleOpenEditModal(user)}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1 mr-1" 
                            title="Chỉnh sửa thông tin"
                          >
                            <span className="material-symbols-outlined text-[20px] align-middle">
                              edit
                            </span>
                          </button>

                          {user.id !== 1 && ( // Không cho phép xóa Admin Toàn Quyền
                            <button 
                              onClick={() => handleTriggerDelete(user)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1" 
                              title="Xóa người dùng"
                            >
                              <span className="material-symbols-outlined text-[20px] align-middle">
                                delete
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Thanh Phân Trang */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="text-xs text-gray-500 font-medium">
                  Hiển thị từ <span className="font-bold text-gray-700">{indexOfFirstItem + 1}</span> đến{' '}
                  <span className="font-bold text-gray-700">
                    {Math.min(indexOfLastItem, filteredUsers.length)}
                  </span>{' '}
                  trong tổng số <span className="font-bold text-gray-700">{filteredUsers.length}</span> người dùng
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-green-600 border-green-600 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL XÁC NHẬN CẤP QUYỀN BẰNG MẬT KHẨU ADMIN */}
      {showConfirmModal && pendingChange && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-2 text-red-600">
                <span className="material-symbols-outlined text-2xl">shield_lock</span>
                <h2 className="text-lg font-black">Xác Nhận Thay Đổi Quyền</h2>
              </div>
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingChange(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleConfirmRoleChange} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-600 leading-relaxed border border-gray-100">
                Bạn đang chuẩn bị thay đổi vai trò của tài khoản <strong className="text-gray-900 font-bold">{pendingChange.userName}</strong>:
                <div className="mt-3 flex items-center justify-center gap-3 font-semibold text-xs py-1">
                  <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-500 border border-gray-200">{translateRole(pendingChange.currentRole)}</span>
                  <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward</span>
                  <span className="bg-blue-100 px-3 py-1.5 rounded-lg text-blue-700 border border-blue-200">{translateRole(pendingChange.newRole)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Để xác nhận, vui lòng nhập Mật khẩu Admin của bạn</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                  <input 
                    type="password" 
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" 
                    placeholder="Nhập mật khẩu Admin..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowConfirmModal(false); setPendingChange(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  disabled={confirmLoading}
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center min-w-[120px]"
                >
                  {confirmLoading ? <span className="material-symbols-outlined animate-spin text-sm">autorenew</span> : 'Cấp quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA NGƯỜI DÙNG CHUYÊN NGHIỆP */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h2 className="text-lg font-black">Xác Nhận Xóa Tài Khoản</h2>
              </div>
              <button 
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của <strong className="text-gray-900 font-bold">{userToDelete.name}</strong> ({userToDelete.email}) khỏi hệ thống? 
                <br />
                <span className="text-red-500 font-semibold mt-2 block">⚠️ Lưu ý: Hành động này là vĩnh viễn và không thể khôi phục lại dữ liệu!</span>
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center min-w-[120px]"
                >
                  {deleteLoading ? <span className="material-symbols-outlined animate-spin text-sm">autorenew</span> : 'Xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM NGƯỜI DÙNG BỞI ADMIN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Thêm Người Dùng Mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email đăng nhập</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: 0987654321"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu ban đầu</label>
                <input 
                  type="text" 
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: password123"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phân quyền tài khoản</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white"
                >
                  <option value="user">Khách hàng (User)</option>
                  <option value="coach">Huấn luyện viên (PT/Coach)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm">
                  Thêm Người Dùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA THÔNG TIN NGƯỜI DÙNG / HLV */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 my-8">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">manage_accounts</span>
                {editFormData.role === 'coach' ? 'Chỉnh Sửa Thông Tin HLV (PT)' : 'Chỉnh Sửa Thông Tin Thành Viên'}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: 0987654321"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Link ảnh đại diện (Avatar URL)</label>
                <input 
                  type="text" 
                  value={editFormData.avatar}
                  onChange={(e) => setEditFormData({...editFormData, avatar: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
                  placeholder="VD: https://images.unsplash.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vai trò</label>
                <select 
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white"
                >
                  <option value="user">Khách hàng (User)</option>
                  <option value="coach">Huấn luyện viên (PT/Coach)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              {/* CÁC TRƯỜNG THÔNG TIN HLV (Chỉ hiển thị nếu vai trò là coach) */}
              {editFormData.role === 'coach' && (
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-xs font-black text-green-800 uppercase tracking-wider mb-2">Thông tin chuyên môn HLV</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Chuyên môn (Expertise)</label>
                    <input 
                      type="text" 
                      value={editFormData.expertise || ''}
                      onChange={(e) => setEditFormData({...editFormData, expertise: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white" 
                      placeholder="VD: Căn bản & Nâng cao, Chiến thuật đánh đôi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kinh nghiệm (Experience)</label>
                    <input 
                      type="text" 
                      value={editFormData.experience || ''}
                      onChange={(e) => setEditFormData({...editFormData, experience: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white" 
                      placeholder="VD: 3 năm, 5 năm kinh nghiệm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Học phí / Giờ (Hourly Rate)</label>
                    <input 
                      type="number" 
                      value={editFormData.hourly_rate || ''}
                      onChange={(e) => setEditFormData({...editFormData, hourly_rate: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white" 
                      placeholder="VD: 250000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Giới thiệu bản thân (Bio)</label>
                    <textarea 
                      value={editFormData.bio || ''}
                      onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition bg-white" 
                      placeholder="VD: Nhiệt tình, có chứng chỉ HLV chuyên nghiệp..."
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-red-600 mb-1">Mật khẩu xác nhận Admin</label>
                <input 
                  type="password" 
                  required
                  value={editFormData.admin_password}
                  onChange={(e) => setEditFormData({...editFormData, admin_password: e.target.value})}
                  className="w-full border border-red-200 focus:border-red-500 focus:ring-red-500 rounded-xl px-4 py-2 text-sm outline-none transition" 
                  placeholder="Nhập mật khẩu Admin của bạn để lưu..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {editLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
