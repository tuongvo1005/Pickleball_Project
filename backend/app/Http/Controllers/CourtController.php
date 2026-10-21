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
            'slots' => 'nullable|array',
            'maintenance_start_date' => 'nullable|date',
            'maintenance_end_date' => 'nullable|date|after_or_equal:maintenance_start_date',
            'maintenance_reason' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $newStatus = $request->has('status') ? $request->status : $court->status;

        // Quy trình Bảo trì sân: Kiểm tra đối chiếu với đơn đặt lịch của khách hàng
        if ($newStatus === 'maintenance') {
            $startDate = $request->has('maintenance_start_date') ? $request->maintenance_start_date : $court->maintenance_start_date;
            $endDate = $request->has('maintenance_end_date') ? $request->maintenance_end_date : $court->maintenance_end_date;

            // Bước 3 & Rẽ nhánh 1: Hệ thống quét DB để đối chiếu với các đơn đặt lịch của khách hàng trong khoảng thời gian này
            if ($startDate && $endDate) {
                $hasOverlappingBookings = \App\Models\Booking::where('court_id', $id)
                    ->where('status', '!=', 'cancelled')
                    ->where('payment_status', '!=', 'failed')
                    ->where(function($query) use ($startDate, $endDate) {
                        $query->whereBetween('booking_date', [$startDate, $endDate]);
                    })
                    ->exists();

                if ($hasOverlappingBookings) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Không thể bảo trì do sân đang có khách đặt trong thời gian này. Vui lòng dời lịch khách hoặc hủy đơn trước khi thiết lập bảo trì.'
                    ], 400);
                }
            } else {
                // Nếu chuyển sang bảo trì mà không truyền ngày cụ thể, kiểm tra các đơn từ hôm nay trở đi
                $hasFutureBookings = \App\Models\Booking::where('court_id', $id)
                    ->where('status', '!=', 'cancelled')
                    ->where('payment_status', '!=', 'failed')
                    ->where('booking_date', '>=', now()->toDateString())
                    ->exists();

                if ($hasFutureBookings) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Không thể bảo trì do sân đang có khách đặt trong thời gian này. Vui lòng dời lịch khách hoặc hủy đơn trước khi thiết lập bảo trì.'
                    ], 400);
                }
            }
        } else if ($newStatus === 'active') {
            // Nếu kích hoạt lại sân: Xóa thông tin bảo trì
            $request->merge([
                'maintenance_start_date' => null,
                'maintenance_end_date' => null,
                'maintenance_reason' => null,
            ]);
        }

        $court->update($request->all());

        return response()->json([
            'success' => true,
            'message' => $newStatus === 'maintenance' 
                ? 'Thiết lập bảo trì sân thành công! Tất cả khung giờ trong khoảng thời gian này đã được khóa.' 
                : 'Cập nhật thông tin sân thành công!',
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
