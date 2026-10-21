<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * Lấy danh sách tất cả các đánh giá
     */
    public function index(Request $request)
    {
        $query = Review::with(['user:id,name', 'reviewable']);

        // Nếu không yêu cầu lấy toàn bộ, chỉ hiển thị đánh giá hoạt động (active)
        if (!$request->query('all')) {
            $query->where('status', 'active');
        }

        $reviews = $query->get();

        return response()->json([
            'success' => true,
            'data' => $reviews
        ], 200);
    }

    /**
     * Đăng tải một đánh giá mới
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'reviewable_type' => 'required|string', // VD: App\Models\Court hoặc App\Models\User
            'reviewable_id' => 'required|integer', // ID của Sân hoặc HLV
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra xem đối tượng (Court hoặc User/Coach) có tồn tại không
        $modelClass = $request->reviewable_type;
        if (!class_exists($modelClass) || !$modelClass::find($request->reviewable_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Đối tượng được đánh giá không tồn tại.'
            ], 404);
        }

        // Đảm bảo đánh giá mới lưu với trạng thái mặc định 'active'
        $data = $request->all();
        $data['status'] = 'active';

        $review = Review::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Cảm ơn bạn đã gửi đánh giá!',
            'data' => $review
        ], 201);
    }

    /**
     * Lấy thông tin 1 đánh giá
     */
    public function show($id)
    {
        $review = Review::with(['user:id,name', 'reviewable'])->find($id);

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đánh giá.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $review
        ], 200);
    }

    /**
     * Cập nhật / Sửa đánh giá
     */
    public function update(Request $request, $id)
    {
        $review = Review::find($id);

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đánh giá.'
            ], 404);
        }

        if ($request->user() && $request->user()->id !== $review->user_id && $request->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền chỉnh sửa đánh giá này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'sometimes|required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $review->update($request->only(['rating', 'comment']));

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật đánh giá thành công!',
            'data' => $review
        ], 200);
    }

    /**
     * Xóa vĩnh viễn đánh giá (Dành cho Admin)
     */
    public function destroy($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đánh giá.'
            ], 404);
        }

        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa vĩnh viễn đánh giá thành công!'
        ], 200);
    }

    /**
     * Chuyển đổi trạng thái Ẩn / Hiện đánh giá (Dành cho Admin)
     */
    public function toggleHide($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đánh giá.'
            ], 404);
        }

        $newStatus = $review->status === 'hidden' ? 'active' : 'hidden';
        $review->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'message' => $newStatus === 'hidden' ? 'Đã ẩn đánh giá thành công!' : 'Đã hiển thị lại đánh giá thành công!',
            'data' => $review
        ], 200);
    }
}
