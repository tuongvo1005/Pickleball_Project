<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CourtController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\MessageController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Phân quyền theo 3 tầng:
|   [PUBLIC]  - Ai cũng truy cập được (không cần token)
|   [AUTH]    - Phải đăng nhập (có token Sanctum)
|   [ADMIN]   - Phải đăng nhập VÀ có role = admin
|--------------------------------------------------------------------------
*/

// ═══════════════════════════════════════════════════════════════
// [PUBLIC] Auth cơ bản — Không cần token
// ═══════════════════════════════════════════════════════════════
Route::post('/register',   [AuthController::class, 'register']);
Route::post('/login',      [AuthController::class, 'login']);
Route::post('/send-code',  [AuthController::class, 'sendCode']);
Route::post('/forgot-password/send-otp', [AuthController::class, 'sendForgotPasswordOtp']);
Route::post('/forgot-password/reset',    [AuthController::class, 'resetPasswordWithOtp']);

// Dữ liệu hiển thị công khai (chỉ READ)
Route::get('/coaches',                     [AuthController::class,    'getCoaches']);
Route::get('/courts',                      [CourtController::class,   'index']);
Route::get('/courts/{court}',              [CourtController::class,   'show']);
Route::get('/products',                    [ProductController::class, 'index']);
Route::get('/products/{product}',          [ProductController::class, 'show']);
Route::get('/tournaments',                 [TournamentController::class, 'index']);
Route::get('/tournaments/{tournament}',    [TournamentController::class, 'show']);
Route::get('/reviews',                     [ReviewController::class,  'index']);

// ═══════════════════════════════════════════════════════════════
// [AUTH] Yêu cầu đăng nhập — Dành cho User thông thường & Admin
// ═══════════════════════════════════════════════════════════════
Route::middleware('auth:sanctum')->group(function () {

    // --- Tài khoản ---
    Route::get('/profile',           [AuthController::class, 'profile']);
    Route::put('/profile',           [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar',   [AuthController::class, 'uploadAvatar']);
    Route::post('/logout',           [AuthController::class, 'logout']);

    // --- Live Chat ---
    Route::get('/messages/contacts',        [MessageController::class, 'contacts']);
    Route::get('/messages/thread/admin',    [MessageController::class, 'getAdminChatThread']);
    Route::get('/messages/{otherUserId}',   [MessageController::class, 'getChatThread']);
    Route::post('/messages',                [MessageController::class, 'sendMessage']);

    // --- Đặt lịch (User tự tạo & cập nhật cọc/thanh toán) ---
    Route::get('/bookings',                      [BookingController::class, 'index']);
    Route::get('/bookings/{booking}',            [BookingController::class, 'show']);
    Route::post('/bookings',                     [BookingController::class, 'store']);
    Route::put('/bookings/{booking}',            [BookingController::class, 'update']);
    Route::post('/bookings/{id}/cancel-request', [BookingController::class, 'requestCancel']);

    // --- Đơn hàng (User tự tạo & xem của mình) ---
    Route::get('/orders/my',                              [OrderController::class, 'index']);         // ?user_id=X
    Route::get('/orders',                                 [OrderController::class, 'index']);          // Admin lọc thêm
    Route::get('/orders/{id}',                            [OrderController::class, 'show']);
    Route::post('/orders',                                [OrderController::class, 'store']);
    Route::post('/orders/{id}/confirm-received',          [OrderController::class, 'confirmReceived']); // Khách xác nhận

    // --- Giải đấu (User tự đăng ký & hủy đăng ký) ---
    Route::post('/tournaments/{id}/join',                 [TournamentController::class, 'joinTournament']);
    Route::post('/tournaments/{id}/leave',                [TournamentController::class, 'leaveTournament']);

    // --- Đánh giá (User tự viết & Admin quản lý) ---
    Route::post('/reviews',                     [ReviewController::class, 'store']);
    Route::put('/reviews/{review}',             [ReviewController::class, 'update']);
    Route::put('/reviews/{id}/toggle-hide',     [ReviewController::class, 'toggleHide']);
    Route::delete('/reviews/{review}',          [ReviewController::class, 'destroy']);

    // ═══════════════════════════════════════════════════════════
    // [ADMIN] Chỉ Admin mới được dùng — middleware check role
    // ═══════════════════════════════════════════════════════════
    Route::middleware('admin')->group(function () {

        // Quản lý Users
        Route::get('/admin/users',                    [AuthController::class, 'getAllUsers']);
        Route::post('/admin/users',                   [AuthController::class, 'createUserByAdmin']);
        Route::put('/admin/users/{id}',               [AuthController::class, 'updateUserByAdmin']);
        Route::put('/admin/users/{id}/toggle-lock',   [AuthController::class, 'toggleLockUserByAdmin']);
        Route::delete('/admin/users/{id}',            [AuthController::class, 'deleteUserByAdmin']);

        // Quản lý Sân (CRUD đầy đủ)
        Route::post('/courts',               [CourtController::class,   'store']);
        Route::put('/courts/{court}',        [CourtController::class,   'update']);
        Route::delete('/courts/{court}',     [CourtController::class,   'destroy']);

        // Quản lý Sản phẩm (CRUD đầy đủ)
        Route::post('/products',             [ProductController::class, 'store']);
        Route::put('/products/{product}',    [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        // Quản lý Đặt lịch (Admin hủy đơn)
        Route::delete('/bookings/{booking}', [BookingController::class, 'destroy']);

        // Quản lý Đơn hàng (Admin cập nhật trạng thái)
        Route::put('/orders/{id}',           [OrderController::class, 'update']);
        Route::delete('/orders/{id}',        [OrderController::class, 'destroy']);

        // Quản lý Giải đấu (CRUD đầy đủ)
        Route::post('/tournaments',                             [TournamentController::class, 'store']);
        Route::put('/tournaments/{tournament}',                 [TournamentController::class, 'update']);
        Route::delete('/tournaments/{tournament}',              [TournamentController::class, 'destroy']);
        Route::delete('/tournaments/{id}/remove-participant',   [TournamentController::class, 'removeParticipant']);
    });
});
