<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingController extends Controller
{
    /**
     * Lấy danh sách lượt đặt (Kèm thông tin Khách, Sân, HLV)
     */
    public function index()
    {
        // Sử dụng Eager Loading để lấy luôn tên User, Sân, HLV giúp giảm thiểu query
        $bookings = Booking::with(['user:id,name,phone', 'court:id,name', 'coach:id,name'])->get();
        
        return response()->json([
            'success' => true,
            'data' => $bookings
        ], 200);
    }

    /**
     * Lấy chi tiết 1 lượt đặt
     */
    public function show($id)
    {
        $booking = Booking::with(['user', 'court', 'coach'])->find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin đặt lịch.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $booking
        ], 200);
    }

    /**
     * Tạo lượt đặt lịch mới (Thêm Booking)
     */
    public function store(Request $request)
    {
        // Kiểm tra coach_id có tồn tại trong DB không, nếu không thì tự động gán HLV đầu tiên hoặc User đầu tiên
        if ($request->has('coach_id') && !empty($request->coach_id)) {
            $exists = \App\Models\User::where('id', $request->coach_id)->exists();
            if (!$exists) {
                $fallbackCoach = \App\Models\User::where('role', 'coach')->first();
                if ($fallbackCoach) {
                    $request->merge(['coach_id' => $fallbackCoach->id]);
                } else {
                    $fallbackUser = \App\Models\User::first();
                    if ($fallbackUser) {
                        $request->merge(['coach_id' => $fallbackUser->id]);
                    } else {
                        $request->merge(['coach_id' => null]);
                    }
                }
            }
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'court_id' => 'nullable|exists:courts,id',
            'coach_id' => 'nullable|exists:users,id',
            'booking_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'total_price' => 'required|numeric|min:0',
            'payment_status' => 'sometimes|in:pending,paid,refunded,failed',
            'status' => 'sometimes|in:pending,confirmed,completed,cancelled',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Đảm bảo phải chọn ít nhất Sân hoặc HLV
        if (empty($request->court_id) && empty($request->coach_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Phải chọn thuê ít nhất một Sân hoặc một Huấn Luyện Viên.'
            ], 400);
        }

        // Kiểm tra xem Sân có bị trùng lịch hay không
        if (!empty($request->court_id)) {
            $overlapping_court_booking = Booking::where('court_id', $request->court_id)
                ->where('booking_date', $request->booking_date)
                ->where('status', '!=', 'cancelled')
                ->where('payment_status', '!=', 'failed')
                ->where(function($query) use ($request) {
                    $query->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>', $request->start_time);
                })
                ->exists();
                
            if ($overlapping_court_booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sân này đã được đặt trong khung giờ được chọn. Vui lòng chọn sân hoặc khung giờ khác.'
                ], 400);
            }
        }

        // Kiểm tra xem HLV có bị trùng lịch hay không
        if (!empty($request->coach_id)) {
            $overlapping_coach_booking = Booking::where('coach_id', $request->coach_id)
                ->where('booking_date', $request->booking_date)
                ->where('status', '!=', 'cancelled')
                ->where('payment_status', '!=', 'failed')
                ->where(function($query) use ($request) {
                    $query->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>', $request->start_time);
                })
                ->exists();
                
            if ($overlapping_coach_booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Huấn luyện viên này đã có lịch dạy trong khung giờ được chọn. Vui lòng chọn khung giờ khác.'
                ], 400);
            }
        }

        $data = $request->all();

        // Tự động tìm sân trống và gán khi thuê HLV (nếu chưa chọn sân)
        if (empty($request->court_id) && !empty($request->coach_id)) {
            $all_court_ids = \App\Models\Court::pluck('id')->toArray();
            
            $booked_court_ids = Booking::where('booking_date', $request->booking_date)
                ->where('status', '!=', 'cancelled')
                ->whereNotNull('court_id')
                ->where(function($query) use ($request) {
                    $query->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>', $request->start_time);
                })
                ->pluck('court_id')
                ->toArray();
                
            $available_court_ids = array_diff($all_court_ids, $booked_court_ids);
            
            if (!empty($available_court_ids)) {
                $data['court_id'] = reset($available_court_ids);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Xin lỗi, tất cả các sân đều đã kín lịch trong khung giờ này. Không thể thuê HLV.'
                ], 400);
            }
        }

        // Lưu vào DB
        $booking = Booking::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Đặt lịch thành công!',
            'data' => $booking
        ], 201);
    }

    /**
     * Cập nhật thông tin đặt lịch (Ví dụ: Cập nhật trạng thái thanh toán)
     */
    public function update(Request $request, $id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin đặt lịch.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'payment_status' => 'sometimes|required|in:pending,paid,refunded,failed',
            'status' => 'sometimes|required|in:pending,confirmed,completed,cancelled',
            'notes' => 'nullable|string',
            'coach_id' => 'nullable|exists:users,id',
            'court_id' => 'nullable|exists:courts,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $booking->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật lịch thành công!',
            'data' => $booking
        ], 200);
    }

    /**
     * Hủy/Xóa lượt đặt lịch
     */
    public function destroy($id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin đặt lịch.'
            ], 404);
        }

        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy lịch thành công!'
        ], 200);
    }
}
