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
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// --- AUTH ROUTES ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/send-code', [AuthController::class, 'sendCode']);
Route::get('/coaches', [AuthController::class, 'getCoaches']);

// Các route yêu cầu phải đăng nhập (Cần truyền Header: Authorization Bearer <token>)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [AuthController::class, 'uploadAvatar']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- ADMIN USER MANAGEMENT ---
    Route::get('/admin/users', [AuthController::class, 'getAllUsers']);
    Route::post('/admin/users', [AuthController::class, 'createUserByAdmin']);
    Route::put('/admin/users/{id}', [AuthController::class, 'updateUserByAdmin']);
    Route::delete('/admin/users/{id}', [AuthController::class, 'deleteUserByAdmin']);

    // --- LIVE CHAT ROUTES ---
    Route::get('/messages/contacts', [MessageController::class, 'contacts']);
    Route::get('/messages/thread/admin', [MessageController::class, 'getAdminChatThread']);
    Route::get('/messages/{otherUserId}', [MessageController::class, 'getChatThread']);
    Route::post('/messages', [MessageController::class, 'sendMessage']);
});

// --- PICKLEBALL API ROUTES ---

/**
 * Quản lý Sân (Courts)
 * 
 * Route::apiResource sẽ tự động sinh ra 5 endpoints chuẩn RESTful:
 * 1. GET    /api/courts          -> CourtController@index
 * 2. POST   /api/courts          -> CourtController@store
 * 3. GET    /api/courts/{court}  -> CourtController@show
 * 4. PUT    /api/courts/{court}  -> CourtController@update
 * 5. DELETE /api/courts/{court}  -> CourtController@destroy
 */
Route::apiResource('courts', CourtController::class);

/**
 * Quản lý Cửa hàng (Products)
 */
Route::apiResource('products', ProductController::class);

/**
 * Quản lý Đặt Lịch (Bookings) - Cho cả Thuê Sân và Thuê HLV
 */
Route::apiResource('bookings', BookingController::class);

/**
 * Quản lý Đơn hàng (Orders)
 */
Route::apiResource('orders', OrderController::class);

/**
 * Quản lý Giải đấu (Tournaments)
 */
Route::apiResource('tournaments', TournamentController::class);
Route::post('tournaments/{id}/join', [TournamentController::class, 'joinTournament']);
Route::delete('tournaments/{id}/remove-participant', [TournamentController::class, 'removeParticipant']);

/**
 * Quản lý Đánh giá (Reviews)
 */
Route::apiResource('reviews', ReviewController::class);
