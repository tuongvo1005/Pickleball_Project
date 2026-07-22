<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Ràng buộc luồng chuyển đổi trạng thái dành cho ADMIN.
     */
    private const ADMIN_TRANSITIONS = [
        'pending'    => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped'    => ['delivered', 'cancelled'],    // Admin có thể chủ động chuyển sang "delivered" sau khi đối soát
        'delivered'  => [],
        'cancelled'  => [],
    ];

    /**
     * Lấy danh sách đơn hàng
     * GET /api/orders           -> Tất cả (Admin)
     * GET /api/orders?user_id=X -> Đơn của user X
     */
    public function index(Request $request)
    {
        $query = Order::with('user:id,name,email,phone')
                      ->orderBy('created_at', 'desc');

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        $orders = $query->get();

        return response()->json([
            'success' => true,
            'data'    => $orders,
            'total'   => $orders->count(),
        ], 200);
    }

    /**
     * Lấy chi tiết 1 đơn hàng
     * GET /api/orders/{id}
     */
    public function show($id)
    {
        $order = Order::with('user:id,name,email,phone')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $order,
        ], 200);
    }

    /**
     * Tạo đơn hàng mới (Khách hàng đặt hàng)
     * POST /api/orders
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id'              => 'required|exists:users,id',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required|exists:products,id',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'shipping_details'     => 'nullable|array',
            'total_amount'         => 'required|numeric|min:0',
            'status'               => 'sometimes|in:pending,processing,shipped,delivered,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        // COD -> tự động processing, online payment -> pending
        $paymentMethod = $request->input('shipping_details.paymentMethod', 'cod');
        $status = ($paymentMethod === 'cod') ? 'processing' : ($request->status ?? 'pending');

        $order = Order::create([
            'user_id'          => $request->user_id,
            'items'            => $request->items,
            'shipping_details' => $request->shipping_details,
            'total_amount'     => $request->total_amount,
            'status'           => $status,
        ]);

        $order->load('user:id,name,email,phone');

        return response()->json([
            'success' => true,
            'message' => 'Đặt hàng thành công!',
            'data'    => $order,
        ], 201);
    }

    /**
     * Cập nhật trạng thái đơn hàng — DÀNH CHO ADMIN
     * PUT /api/orders/{id}
     * Body: { "status": "shipped" }
     *
     * Lưu ý: Admin KHÔNG thể tự đặt "delivered".
     * Chỉ khách hàng mới có thể xác nhận đã nhận qua endpoint /confirm-received.
     */
    public function update(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $newStatus     = $request->status;
        $currentStatus = $order->status;

        if ($currentStatus === $newStatus) {
            return response()->json([
                'success' => false,
                'message' => "Đơn hàng đang ở trạng thái \"{$this->statusLabel($currentStatus)}\" rồi.",
            ], 422);
        }

        $allowedNext = self::ADMIN_TRANSITIONS[$currentStatus] ?? [];

        if (!in_array($newStatus, $allowedNext)) {
            $allowedLabels = array_map(fn($s) => $this->statusLabel($s), $allowedNext);
            $allowed = empty($allowedLabels)
                ? 'Trạng thái này không thể thay đổi thêm'
                : 'Chỉ có thể chuyển sang: ' . implode(', ', $allowedLabels);

            return response()->json([
                'success' => false,
                'message' => "Không thể chuyển từ \"{$this->statusLabel($currentStatus)}\" sang \"{$this->statusLabel($newStatus)}\". {$allowed}.",
            ], 422);
        }

        $order->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'message' => "Đã chuyển đơn hàng #DH00{$order->id} sang \"{$this->statusLabel($newStatus)}\" thành công!",
            'data'    => $order->fresh('user'),
        ], 200);
    }

    /**
     * Khách hàng xác nhận đã nhận hàng
     * POST /api/orders/{id}/confirm-received
     *
     * - Chỉ chủ đơn hàng mới được gọi
     * - Đơn phải đang ở trạng thái "shipped"
     * - Chuyển sang "delivered"
     */
    public function confirmReceived(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        // Kiểm tra đơn hàng thuộc về đúng user
        $userId = $request->input('user_id');
        if (!$userId || (int)$order->user_id !== (int)$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận đơn hàng này.',
            ], 403);
        }

        // Chỉ được xác nhận khi đơn đang ở trạng thái "shipped"
        if ($order->status !== 'shipped') {
            return response()->json([
                'success' => false,
                'message' => "Không thể xác nhận nhận hàng. Đơn hàng đang ở trạng thái \"{$this->statusLabel($order->status)}\" chứ không phải \"Đang giao hàng\".",
            ], 422);
        }

        $order->update(['status' => 'delivered']);

        return response()->json([
            'success' => true,
            'message' => "Cảm ơn bạn! Đơn hàng #DH00{$order->id} đã được xác nhận giao thành công. Chúc bạn tập luyện vui vẻ! 🎉",
            'data'    => $order->fresh('user'),
        ], 200);
    }

    /**
     * Xóa đơn hàng (Admin — chỉ xóa đơn đã hủy hoặc đã giao)
     * DELETE /api/orders/{id}
     */
    public function destroy($id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        if (!in_array($order->status, ['cancelled', 'delivered'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa đơn hàng đã hủy hoặc đã giao thành công.',
            ], 422);
        }

        $order->delete();

        return response()->json([
            'success' => true,
            'message' => "Đã xóa đơn hàng #DH00{$id} thành công!",
        ], 200);
    }

    /**
     * Helper: chuyển status code sang nhãn tiếng Việt
     */
    private function statusLabel(string $status): string
    {
        return match($status) {
            'pending'    => 'Chờ xử lý',
            'processing' => 'Đang xử lý',
            'shipped'    => 'Đang giao hàng',
            'delivered'  => 'Đã giao hàng',
            'cancelled'  => 'Đã hủy',
            default      => $status,
        };
    }
}
