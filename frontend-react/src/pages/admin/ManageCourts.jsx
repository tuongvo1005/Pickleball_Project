import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

const DEFAULT_SLOTS = ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];

const ManageCourts = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  
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

  // Modal Xác nhận xóa sân bảo mật (Thay thế window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState(null);

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
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Tên sân</th>
                <th className="px-6 py-4 font-medium">Loại sân</th>
                <th className="px-6 py-4 font-medium">Giá / Giờ</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-10">Đang tải dữ liệu...</td></tr>
              ) : courts.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10">Chưa có dữ liệu</td></tr>
              ) : (
                courts.map((court) => (
                  <tr key={court.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">#{court.id}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{court.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        court.type === 'trong-nha' || court.type === 'indoor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {court.type === 'trong-nha' || court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-green-600 font-bold">{Number(court.price_per_hour).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditModal(court)} className="text-blue-500 hover:text-blue-700 mr-3" title="Sửa">
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
    </div>
  );
};

export default ManageCourts;
