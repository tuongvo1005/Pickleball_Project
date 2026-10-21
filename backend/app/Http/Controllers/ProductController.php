<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * Lấy danh sách sản phẩm
     */
    public function index()
    {
        $products = Product::all();
        
        return response()->json([
            'success' => true,
            'data' => $products
        ], 200);
    }

    /**
     * Lấy chi tiết 1 sản phẩm
     */
    public function show($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $product
        ], 200);
    }

    /**
     * Thêm sản phẩm mới (Dành cho Admin)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'rental_price' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'status' => 'sometimes|required|string|max:50',
            'image_url' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $product = Product::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Thêm sản phẩm thành công!',
            'data' => $product
        ], 201);
    }

    /**
     * Cập nhật thông tin sản phẩm (Dành cho Admin)
     */
    public function update(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'stock' => 'sometimes|required|integer|min:0',
            'status' => 'sometimes|required|string|max:50',
            'image_url' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $product->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật sản phẩm thành công!',
            'data' => $product
        ], 200);
    }

    /**
     * Xóa sản phẩm (Dành cho Admin - kiểm tra đơn hàng)
     */
    public function destroy($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm.'
            ], 404);
        }

        // Bước 3: Kiểm tra sản phẩm có tồn tại trong đơn hàng nào không
        $hasOrders = \App\Models\Order::where(function($query) use ($id) {
            $query->whereJsonContains('items', [['product_id' => (int)$id]])
                  ->orWhereJsonContains('items', [['product_id' => (string)$id]]);
        })->exists();

        if ($hasOrders) {
            // Sản phẩm đã có giao dịch -> chuyển sang ngưng kinh doanh (inactive)
            $product->status = 'inactive';
            $product->save();

            return response()->json([
                'success' => true,
                'message' => 'Sản phẩm đã có lịch sử giao dịch, hệ thống tự động chuyển trạng thái sang Ngưng kinh doanh (inactive) để bảo toàn dữ liệu.'
            ], 200);
        }

        // Sản phẩm mới chưa từng giao dịch -> xóa vĩnh viễn
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa sản phẩm thành công!'
        ], 200);
    }
}
