<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Kiểm tra user đang đăng nhập có phải Admin không.
     * Phải đặt sau middleware auth:sanctum để $request->user() đã có giá trị.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Chưa đăng nhập hoặc không có thông tin user
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
            ], 401);
        }

        // Đã đăng nhập nhưng không phải Admin
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện hành động này. Chỉ dành cho quản trị viên.',
            ], 403);
        }

        return $next($request);
    }
}
