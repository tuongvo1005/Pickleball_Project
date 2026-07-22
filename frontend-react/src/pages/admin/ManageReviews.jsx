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

  const handleTriggerHide = (review) => {
    setReviewToHide(review);
    setShowConfirmModal(true);
  };

  const handleConfirmHide = async () => {
    if (!reviewToHide) return;
    setSubmitting(true);
    try {
      // Gọi API xóa (hệ thống sẽ cập nhật trạng thái thành 'hidden' thay vì xóa vĩnh viễn)
      const res = await axiosClient.delete(`/reviews/${reviewToHide.id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Ẩn đánh giá vi phạm thành công!');
        setShowConfirmModal(false);
        setReviewToHide(null);
        fetchReviews(); // Tải lại danh sách
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi ẩn đánh giá.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rà soát và ẩn các bài đánh giá có nội dung không phù hợp hoặc vi phạm tiêu chuẩn cộng đồng.
          </p>
        </div>
        <button 
          onClick={fetchReviews} 
          disabled={loading}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Người đánh giá</th>
                <th className="px-6 py-4 font-medium">Đối tượng</th>
                <th className="px-6 py-4 font-medium">Đánh giá</th>
                <th className="px-6 py-4 font-medium">Nội dung bình luận</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-center">Thao tác</th>
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
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block">rate_review</span>
                    Chưa có đánh giá nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
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
                        {review.status !== 'hidden' ? (
                          <button
                            onClick={() => handleTriggerHide(review)}
                            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-xl transition text-xs border border-red-100 active:scale-95"
                            title="Xóa/Ẩn đánh giá vi phạm"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Xóa/Ẩn
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium">Bảo lưu (Đã ẩn)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM HIDE MODAL */}
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
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-black">Xác nhận ẩn đánh giá</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Bạn có chắc chắn muốn ẩn đánh giá này không? Dữ liệu gốc sẽ không bị xóa vĩnh viễn, nhưng đánh giá này sẽ **lập tức biến mất** khỏi danh sách hiển thị với khách hàng.
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
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmHide}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
                {submitting ? 'Đang thực hiện...' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageReviews;
