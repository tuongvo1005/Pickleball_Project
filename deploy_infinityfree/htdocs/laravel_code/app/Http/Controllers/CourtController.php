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
            'status' => 'required|in:active,maintenance,inactive'
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
            'status' => 'sometimes|required|in:active,maintenance,inactive'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $court->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin sân thành công!',
            'data' => $court
        ], 200);
    }

    /**
     * Xóa sân (Dành cho Admin)
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

        $court->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa sân thành công!'
        ], 200);
    }
}
