<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TournamentController extends Controller
{
    /**
     * Lấy danh sách giải đấu
     */
    public function index()
    {
        // Lấy giải đấu kèm theo số lượng người tham gia hiện tại (participants_count) và danh sách người chơi
        $tournaments = Tournament::with(['participants:id,name,email,phone'])->withCount('participants')->get();

        return response()->json([
            'success' => true,
            'data' => $tournaments
        ], 200);
    }

    /**
     * Lấy chi tiết 1 giải đấu (kèm danh sách người chơi)
     */
    public function show($id)
    {
        // Load danh sách người tham gia (chỉ lấy tên và email)
        $tournament = Tournament::with('participants:id,name,email,phone')->find($id);

        if (!$tournament) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giải đấu.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $tournament
        ], 200);
    }

    /**
     * Thêm giải đấu mới (Dành cho Admin)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location' => 'nullable|string|max:255',
            'prize' => 'nullable|string|max:255',
            'max_participants' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:upcoming,ongoing,finished'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['status'] = 'upcoming'; // Force starting status to 'upcoming'

        $tournament = Tournament::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Tạo giải đấu thành công!',
            'data' => $tournament
        ], 201);
    }

    /**
     * Cập nhật thông tin giải đấu
     */
    public function update(Request $request, $id)
    {
        $tournament = Tournament::find($id);

        if (!$tournament) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giải đấu.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'location' => 'nullable|string|max:255',
            'prize' => 'nullable|string|max:255',
            'max_participants' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:upcoming,ongoing,finished'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $tournament->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật giải đấu thành công!',
            'data' => $tournament
        ], 200);
    }

    /**
     * Xóa giải đấu
     */
    public function destroy($id)
    {
        $tournament = Tournament::find($id);

        if (!$tournament) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giải đấu.'
            ], 404);
        }

        $tournament->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa giải đấu thành công!'
        ], 200);
    }

    /**
     * Cho phép User đăng ký tham gia giải đấu (Bổ sung thêm)
     */
    public function joinTournament(Request $request, $id)
    {
        $tournament = Tournament::find($id);

        if (!$tournament) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giải đấu.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra xem user này đã đăng ký tham gia chưa
        if ($tournament->participants()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Người dùng này đã đăng ký tham gia giải đấu rồi.'
            ], 400);
        }

        // Dùng phương thức attach để thêm user vào bảng pivot tournament_participants
        $tournament->participants()->attach($request->user_id);

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký tham gia giải đấu thành công!'
        ], 200);
    }

    /**
     * Hủy đăng ký / Tự hủy tham gia giải đấu (Dành cho User hoặc Admin)
     */
    public function leaveTournament(Request $request, $id)
    {
        $tournament = Tournament::find($id);

        if (!$tournament) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giải đấu.'
            ], 404);
        }

        $userId = $request->input('user_id') ?: $request->user()->id;

        // Chỉ Admin hoặc chính người dùng đó mới được hủy đăng ký
        if ($request->user()->role !== 'admin' && $request->user()->id != $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chỉ có quyền hủy đăng ký cho chính mình.'
            ], 403);
        }

        if (!$tournament->participants()->where('user_id', $userId)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng ký tham gia giải đấu này.'
            ], 400);
        }

        $tournament->participants()->detach($userId);

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy đăng ký tham gia giải đấu thành công!'
        ], 200);
    }

    /**
     * Hủy đăng ký / Xóa người tham gia khỏi giải đấu (Dành cho Admin)
     */
    public function removeParticipant(Request $request, $id)
    {
        return $this->leaveTournament($request, $id);
    }
}
