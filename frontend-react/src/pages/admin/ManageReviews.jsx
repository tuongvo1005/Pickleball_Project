import { useState, useEffect } from 'react';
import axiosClient from '../../axiosClient';
import { useToast } from '../../contexts/ToastContext';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewToHide, setReviewToHide] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Gọi API với query parameter all=true để lấy cả các đánh giá đã ẩn
      const res = await axiosClient.get('/reviews?all=true');
      setReviews(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Toggle Hide / Unhide
  const handleToggleHide = async (review) => {
    try {
      const res = await axiosClient.put(`/reviews/${review.id}/toggle-hide`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể thay đổi trạng thái đánh giá.');
    }
  };

  // Trigger Delete Confirmation Modal
  const handleTriggerDelete = (review) => {
    setReviewToHide(review);
    setShowConfirmModal(true);
  };

  // Confirm Hard Delete
  const handleConfirmDelete = async () => {
    if (!reviewToHide) return;
    setSubmitting(true);
    try {
      const res = await axiosClient.delete(`/reviews/${reviewToHide.id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Đã xóa vĩnh viễn đánh giá thành công!');
        setShowConfirmModal(false);
        setReviewToHide(null);
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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

  const sortedReviews = (() => {
    if (!sortField) return reviews;
    return [...reviews].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'user_name') {
        aVal = a.user?.name || '';
        bVal = b.user?.name || '';
      } else if (sortField === 'target_name') {
        aVal = a.reviewable?.name || '';
        bVal = b.reviewable?.name || '';
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá & Phản hồi</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi, ẩn/hiện hoặc xóa các đánh giá từ khách hàng.</p>
        </div>
        <button onClick={fetchReviews} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Tải lại
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {renderSortHeader('Người đánh giá', 'user_name')}
                {renderSortHeader('Đối tượng', 'target_name')}
                {renderSortHeader('Đánh giá', 'rating')}
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-gray-700">Nội dung bình luận</th>
                {renderSortHeader('Trạng thái', 'status')}
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-3xl mb-2 block">autorenew</span>
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : sortedReviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block">rate_review</span>
                    Chưa có đánh giá nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                sortedReviews.map((review) => {
                  const targetName = review.reviewable
                    ? (review.reviewable_type.includes('Court')
                        ? `Sân: ${review.reviewable.name}`
                        : `HLV: ${review.reviewable.name}`)
                    : 'Đối tượng không tồn tại';

                  return (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Người đánh giá */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{review.user?.name || 'Khách vãng lai'}</div>
                        <div className="text-xs text-gray-400">#UID{String(review.user_id).padStart(4, '0')}</div>
                      </td>

                      {/* Đối tượng */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          review.reviewable_type.includes('Court')
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {review.reviewable_type.includes('Court') ? 'stadium' : 'support_agent'}
                          </span>
                          {targetName}
                        </span>
                      </td>

                      {/* Số sao */}
                      <td className="px-6 py-4">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={`material-symbols-outlined text-[16px] ${
                                star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'
                              }`}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold block mt-1">
                          {review.rating}/5 sao
                        </span>
                      </td>

                      {/* Nội dung bình luận */}
                      <td className="px-6 py-4 max-w-xs md:max-w-md">
                        <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-3">
                          {review.comment || <span className="text-gray-400 italic">Không có bình luận</span>}
                        </p>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4">
                        {review.status === 'hidden' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                            Đã ẩn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            Đang hiển thị
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút Ẩn/Hiện đánh giá đã được ẩn theo yêu cầu */}

                          <button
                            onClick={() => handleTriggerDelete(review)}
                            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-xl transition text-xs border border-red-100 cursor-pointer"
                            title="Xóa vĩnh viễn đánh giá khỏi CSDL"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
              <h3 className="text-lg font-black">Xác nhận xóa vĩnh viễn</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Bạn có chắc chắn muốn **xóa vĩnh viễn** bài đánh giá này không? Dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu và **không thể khôi phục**.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6 text-sm text-gray-700">
              <div className="font-bold text-gray-900 mb-1">
                Người viết: {reviewToHide?.user?.name || 'Khách vãng lai'}
              </div>
              <div className="italic text-gray-600">
                "{reviewToHide?.comment || 'Không có bình luận'}"
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm cursor-pointer"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                )}
                {submitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageReviews;
