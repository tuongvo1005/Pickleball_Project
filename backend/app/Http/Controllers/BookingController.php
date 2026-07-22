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
     * Cập nhật thông tin đặt lịch (Admin sửa / duyệt hủy)
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
            'status' => 'sometimes|required|in:pending,confirmed,completed,cancelled,Chờ duyệt hủy',
            'notes' => 'nullable|string',
            'coach_id' => 'nullable|exists:users,id',
            'court_id' => 'nullable|exists:courts,id',
            'booking_date' => 'sometimes|required|date_format:Y-m-d',
            'start_time' => 'sometimes|required',
            'end_time' => 'sometimes|required'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $court_id = $request->has('court_id') ? $request->court_id : $booking->court_id;
        $coach_id = $request->has('coach_id') ? $request->coach_id : $booking->coach_id;
        $booking_date = $request->has('booking_date') ? $request->booking_date : $booking->booking_date;
        $start_time = $request->has('start_time') ? $request->start_time : $booking->start_time;
        $end_time = $request->has('end_time') ? $request->end_time : $booking->end_time;
        $status = $request->has('status') ? $request->status : $booking->status;
        $payment_status = $request->has('payment_status') ? $request->payment_status : $booking->payment_status;

        // Chỉ kiểm tra trùng lịch nếu đơn không bị hủy và thanh toán không thất bại
        if ($status !== 'cancelled' && $payment_status !== 'failed') {
            // Kiểm tra trùng lịch sân
            if (!empty($court_id)) {
                $overlapping_court_booking = Booking::where('court_id', $court_id)
                    ->where('booking_date', $booking_date)
                    ->where('id', '!=', $id)
                    ->where(function($query) {
                        $query->whereIn('status', ['confirmed', 'completed'])
                              ->orWhere('payment_status', 'paid');
                    })
                    ->where(function($query) use ($start_time, $end_time) {
                        $query->where('start_time', '<', $end_time)
                              ->where('end_time', '>', $start_time);
                    })
                    ->exists();
                    
                if ($overlapping_court_booking) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sân này đã được đặt trong khung giờ được chọn. Vui lòng chọn sân hoặc khung giờ khác.'
                    ], 400);
                }
            }

            // Kiểm tra trùng lịch HLV
            if (!empty($coach_id)) {
                $overlapping_coach_booking = Booking::where('coach_id', $coach_id)
                    ->where('booking_date', $booking_date)
                    ->where('id', '!=', $id)
                    ->where(function($query) {
                        $query->whereIn('status', ['confirmed', 'completed'])
                              ->orWhere('payment_status', 'paid');
                    })
                    ->where(function($query) use ($start_time, $end_time) {
                        $query->where('start_time', '<', $end_time)
                              ->where('end_time', '>', $start_time);
                    })
                    ->exists();
                    
                if ($overlapping_coach_booking) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Huấn luyện viên này đã có lịch dạy trong khung giờ được chọn. Vui lòng chọn khung giờ khác.'
                    ], 400);
                }
            }
        }

        // Tự động chuyển status thành confirmed nếu thanh toán thành công (paid) và status hiện tại là pending
        if ($payment_status === 'paid' && $status === 'pending') {
            $status = 'confirmed';
        }

        $booking->court_id = $court_id;
        $booking->coach_id = $coach_id;
        $booking->booking_date = $booking_date;
        $booking->start_time = $start_time;
        $booking->end_time = $end_time;
        $booking->status = $status;
        $booking->payment_status = $payment_status;
        if ($request->has('notes')) {
            $booking->notes = $request->notes;
        }
        $booking->save();

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

    /**
     * Yêu cầu Hủy đơn đặt sân (Dành cho Khách hàng)
     */
    public function requestCancel(Request $request, $id)
    {
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin đặt lịch.'
            ], 404);
        }

        // Đảm bảo chỉ khách hàng sở hữu lượt đặt này mới được gửi yêu cầu hủy
        if ($booking->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện hành động này.'
            ], 403);
        }

        // So sánh thời gian nhận sân (booking_date + start_time) với thời gian thực tại
        // Quy định khách hàng phải hủy trước giờ bắt đầu tối thiểu 24 tiếng.
        try {
            $bookingTimeStr = $booking->booking_date . ' ' . $booking->start_time;
            // Kiểm tra format ngày giờ
            if (strpos($booking->start_time, ':') === false) {
                // Đôi khi start_time có dạng "H:i:s", cần handle linh hoạt
                $bookingTimeStr = $booking->booking_date . ' ' . date('H:i', strtotime($booking->start_time));
            }
            $bookingDateTime = \Carbon\Carbon::parse($bookingTimeStr);
            $now = \Carbon\Carbon::now();

            if ($now->diffInHours($bookingDateTime, false) < 24) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể hủy sân do đã quá sát giờ thi đấu.'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi xử lý định dạng thời gian đặt lịch.'
            ], 400);
        }

        // Cập nhật trạng thái và lưu lý do
        $reason = $request->input('reason', 'Không có lý do chi tiết');
        $booking->status = 'Chờ duyệt hủy';
        $booking->notes = ($booking->notes ? $booking->notes . "\n" : "") . "Yêu cầu hủy lịch. Lý do: " . $reason;
        $booking->save();

        return response()->json([
            'success' => true,
            'message' => 'Gửi yêu cầu hủy thành công, vui lòng chờ Admin xử lý!',
            'data' => $booking
        ], 200);
    }
}
