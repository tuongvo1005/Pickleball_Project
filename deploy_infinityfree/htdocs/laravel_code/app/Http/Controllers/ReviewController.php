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
    public function index()
    {
        // Load tên người đánh giá và đối tượng được đánh giá (Sân/HLV)
        $reviews = Review::with(['user:id,name', 'reviewable'])->get();

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

        $review = Review::create($request->all());

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
     * Xóa đánh giá (Dành cho Admin hoặc người viết tự xóa)
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
            'message' => 'Xóa đánh giá thành công!'
        ], 200);
    }
}
