<?php

namespace App\Http\Controllers;

use App\Models\Court;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CourtController extends Controller
{
    /**
     * Lấy danh sách tất cả các sân
     */
    public function index()
    {
        // Có thể thêm điều kiện lấy sân đang 'active' nếu cần
        // $courts = Court::where('status', 'active')->get();
        $courts = Court::all();

        return response()->json([
            'success' => true,
            'data' => $courts
        ], 200);
    }

    /**
     * Lấy thông tin chi tiết 1 sân (kèm các đánh giá)
     */
    public function show($id)
    {
        // Sử dụng Eager Loading để lấy luôn các reviews của sân này
        $court = Court::with('reviews')->find($id);

        if (!$court) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sân.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $court
        ], 200);
    }

    /**
     * Thêm sân mới (Dành cho Admin)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:indoor,outdoor',
            'price_per_hour' => 'required|numeric|min:0',
            'status' => 'required|in:active,maintenance,inactive',
            'slots' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $court = Court::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Thêm sân thành công!',
            'data' => $court
        ], 201);
    }

    /**
     * Cập nhật thông tin sân (Dành cho Admin)
     */
    public function update(Request $request, $id)
    {
        $court = Court::find($id);

        if (!$court) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sân.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:indoor,outdoor',
            'price_per_hour' => 'sometimes|required|numeric|min:0',
            'status' => 'sometimes|required|in:active,maintenance,inactive',
            'slots' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Bước 6 (Quy trình Bảo trì): Kiểm tra đơn đặt lịch tương lai nếu chuyển sang Bảo trì
        if ($request->has('status') && $request->status === 'maintenance') {
            $hasFutureBookings = \App\Models\Booking::where('court_id', $id)
                ->where('status', '!=', 'cancelled')
                ->where('payment_status', '!=', 'failed')
                ->where(function($query) {
                    $query->where('booking_date', '>', now()->toDateString())
                          ->orWhere(function($q) {
                              $q->where('booking_date', '=', now()->toDateString())
                                ->where('start_time', '>=', now()->toTimeString());
                          });
                })
                ->exists();

            if ($hasFutureBookings) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cần xử lý/hủy các đơn đặt trước khi bảo trì sân.'
                ], 400);
            }
        }

        $court->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin sân thành công!',
            'data' => $court
        ], 200);
    }

    /**
     * Xóa sân (Dành cho Admin - kiểm tra khóa ngoại)
     */
    public function destroy($id)
    {
        $court = Court::find($id);

        if (!$court) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sân.'
            ], 404);
        }

        // Bước 3: Kiểm tra khóa ngoại tại các bảng liên quan (bookings)
        $hasBookings = \App\Models\Booking::where('court_id', $id)->exists();

        if ($hasBookings) {
            // Sân đã từng có lịch sử giao dịch -> chuyển sang "Ngưng hoạt động" (inactive)
            $court->status = 'inactive';
            $court->save();

            return response()->json([
                'success' => true,
                'message' => 'Sân đã có lịch sử giao dịch, hệ thống tự động chuyển trạng thái sang Ngưng hoạt động (inactive) để bảo toàn dữ liệu.'
            ], 200);
        }

        // Sân chưa có giao dịch nào -> xóa vĩnh viễn
        $court->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa sân thành công!'
        ], 200);
    }
}
