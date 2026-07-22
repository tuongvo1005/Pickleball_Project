<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Lấy danh sách tất cả hóa đơn (Kèm thông tin người mua)
     */
    public function index()
    {
        $orders = Order::with('user:id,name,email,phone')->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ], 200);
    }

    /**
     * Lấy chi tiết 1 hóa đơn
     */
    public function show($id)
    {
        $order = Order::with('user:id,name,email,phone')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hóa đơn.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ], 200);
    }

    /**
     * Tạo hóa đơn mua hàng mới
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'items' => 'required|array|min:1', // Yêu cầu items phải là một mảng và có ít nhất 1 món
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'status' => 'sometimes|in:pending,processing,shipped,delivered,cancelled'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Lưu vào DB (Laravel sẽ tự động parse mảng items thành JSON text nhờ khai báo $casts trong Model)
        $order = Order::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Đặt hàng thành công!',
            'data' => $order
        ], 201);
    }

    /**
     * Cập nhật trạng thái hóa đơn (Dành cho Admin)
     */
    public function update(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hóa đơn.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $order->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái đơn hàng thành công!',
            'data' => $order
        ], 200);
    }

    /**
     * Xóa hóa đơn
     */
    public function destroy($id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hóa đơn.'
            ], 404);
        }

        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa hóa đơn thành công!'
        ], 200);
    }
}
