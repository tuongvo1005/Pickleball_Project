import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1542323812-70b9231802aa?q=80&w=800&auto=format&fit=crop'
  });

  const [errors, setErrors] = useState({});

  // Modal Xác nhận xóa sản phẩm bảo mật (Thay thế window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchProducts = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/products')
      .then(res => {
        setProducts(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      price: '',
      stock: '',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1542323812-70b9231802aa?q=80&w=800&auto=format&fit=crop'
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setIsEditing(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      image_url: product.image_url || 'https://images.unsplash.com/photo-1542323812-70b9231802aa?q=80&w=800&auto=format&fit=crop'
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    if (isEditing) {
      axios.put(`http://127.0.0.1:8000/api/products/${currentProductId}`, formData)
        .then(() => {
          toast.success('Cập nhật sản phẩm thành công!');
          setShowModal(false);
          fetchProducts();
        })
        .catch(err => {
          console.error(err.response);
          if (err.response && err.response.status === 422) {
            setErrors(err.response.data.errors || {});
            toast.error('Dữ liệu nhập vào không hợp lệ!');
          } else {
            toast.error('Lỗi khi cập nhật sản phẩm.');
          }
        });
    } else {
      axios.post('http://127.0.0.1:8000/api/products', formData)
        .then(() => {
          toast.success('Thêm sản phẩm mới thành công!');
          setShowModal(false);
          fetchProducts();
        })
        .catch(err => {
          console.error(err.response);
          if (err.response && err.response.status === 422) {
            setErrors(err.response.data.errors || {});
            toast.error('Dữ liệu nhập vào không hợp lệ!');
          } else {
            toast.error('Lỗi khi thêm sản phẩm.');
          }
        });
    }
  };

  const handleTriggerDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    axios.delete(`http://127.0.0.1:8000/api/products/${productToDelete.id}`)
      .then(() => {
        toast.success(`Xóa sản phẩm "${productToDelete.name}" thành công!`);
        setShowDeleteModal(false);
        setProductToDelete(null);
        fetchProducts();
      })
      .catch(err => toast.error('Lỗi khi xóa sản phẩm.'));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cửa hàng & Sản phẩm</h1>
        <button onClick={openAddModal} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 transition shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Sản phẩm</th>
                <th className="px-6 py-4 font-medium">Giá bán</th>
                <th className="px-6 py-4 font-medium">Tồn kho</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-10">Đang tải dữ liệu...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10">Chưa có dữ liệu</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                        {product.image_url ? (
                           <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                           <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 line-clamp-1">{product.name}</span>
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-bold">{Number(product.price).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-4 text-gray-600">{product.stock}</td>
                    <td className="px-6 py-4">
                      {product.stock > 0 ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Còn hàng</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Hết hàng</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditModal(product)} className="text-blue-500 hover:text-blue-700 mr-3" title="Sửa">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleTriggerDelete(product)} className="text-red-500 hover:text-red-700" title="Xóa">
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
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Cập nhật Sản phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full border rounded-lg px-4 py-2 outline-none focus:border-green-500 ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                  placeholder="VD: Vợt Pickleball Joola"
                />
                {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name[0]}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VNĐ)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className={`w-full border rounded-lg px-4 py-2 outline-none focus:border-green-500 ${errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                    placeholder="VD: 5500000"
                  />
                  {errors.price && <span className="text-red-500 text-xs mt-1 block">{errors.price[0]}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tồn kho</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className={`w-full border rounded-lg px-4 py-2 outline-none focus:border-green-500 ${errors.stock ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                    placeholder="VD: 10"
                  />
                  {errors.stock && <span className="text-red-500 text-xs mt-1 block">{errors.stock[0]}</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Hình ảnh (URL)</label>
                <input 
                  type="text" 
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500 text-sm" 
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-green-500"
                  placeholder="Mô tả chi tiết..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                  {isEditing ? 'Lưu thay đổi' : 'Thêm Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA SẢN PHẨM CHUYÊN NGHIỆP */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h2 className="text-lg font-black">Xác Nhận Xóa Sản Phẩm</h2>
              </div>
              <button 
                onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }} 
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm <strong className="text-gray-900 font-bold">{productToDelete.name}</strong> khỏi hệ thống? 
                <br />
                <span className="text-red-500 font-semibold mt-2 block">⚠️ Lưu ý: Hành động này là vĩnh viễn và không thể hoàn tác!</span>
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }} 
                  className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md"
                >
                  Xóa sản phẩm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
