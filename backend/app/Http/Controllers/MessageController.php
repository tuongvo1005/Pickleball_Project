<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    /**
     * Get list of contacts who have chatted with the Admin (Admin-only endpoint)
     */
    public function contacts(Request $request)
    {
        $adminId = Auth::id();

        // Get all unique user IDs that have chatted with Admin
        $sentIds = Message::where('sender_id', $adminId)->pluck('receiver_id')->toArray();
        $receivedIds = Message::where('receiver_id', $adminId)->pluck('sender_id')->toArray();
        $contactIds = array_unique(array_merge($sentIds, $receivedIds));

        // Get details of these users
        $contacts = User::whereIn('id', $contactIds)
            ->where('id', '!=', $adminId)
            ->get(['id', 'name', 'email', 'avatar', 'role']);

        $result = [];
        foreach ($contacts as $contact) {
            // Get last message
            $lastMessage = Message::where(function ($q) use ($adminId, $contact) {
                    $q->where('sender_id', $adminId)->where('receiver_id', $contact->id);
                })
                ->orWhere(function ($q) use ($adminId, $contact) {
                    $q->where('sender_id', $contact->id)->where('receiver_id', $adminId);
                })
                ->orderBy('created_at', 'desc')
                ->first();

            // Count unread messages sent by this contact to the Admin
            $unreadCount = Message::where('sender_id', $contact->id)
                ->where('receiver_id', $adminId)
                ->where('is_read', false)
                ->count();

            $result[] = [
                'id' => $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
                'avatar' => $contact->avatar,
                'role' => $contact->role,
                'last_message' => $lastMessage ? $lastMessage->message : null,
                'last_message_time' => $lastMessage ? $lastMessage->created_at : null,
                'unread_count' => $unreadCount
            ];
        }

        // Sort by last message time descending
        usort($result, function ($a, $b) {
            return strtotime($b['last_message_time']) - strtotime($a['last_message_time']);
        });

        return response()->json([
            'success' => true,
            'data' => $result
        ], 200);
    }

    /**
     * Get chat thread between current user and specified user
     */
    public function getChatThread(Request $request, $otherUserId)
    {
        $userId = Auth::id();

        // Get messages in both directions
        $messages = Message::where(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
            })
            ->orWhere(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark incoming messages as read
        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data' => $messages
        ], 200);
    }

    /**
     * Send a live chat message
     */
    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'receiver_id' => 'nullable|integer|exists:users,id'
        ]);

        $senderId = Auth::id();
        $receiverId = $request->receiver_id;

        // If no receiver_id is provided, route it to the first Admin
        if (!$receiverId) {
            $admin = User::where('role', 'admin')->first();
            if ($admin) {
                $receiverId = $admin->id;
            } else {
                // Fallback to the first user created if no admin exists yet
                $firstUser = User::first();
                $receiverId = $firstUser ? $firstUser->id : $senderId;
            }
        }

        // Create the message
        $message = Message::create([
            'sender_id' => $senderId,
            'receiver_id' => $receiverId,
            'message' => $request->message,
            'is_read' => false
        ]);

        return response()->json([
            'success' => true,
            'data' => $message
        ], 201);
    }

    /**
     * Get chat thread between normal user and Admin
     */
    public function getAdminChatThread(Request $request)
    {
        $userId = Auth::id();
        $admin = User::where('role', 'admin')->first();
        
        if (!$admin) {
            return response()->json([
                'success' => true,
                'data' => []
            ], 200);
        }

        $adminId = $admin->id;

        // Get messages
        $messages = Message::where(function ($q) use ($userId, $adminId) {
                $q->where('sender_id', $userId)->where('receiver_id', $adminId);
            })
            ->orWhere(function ($q) use ($userId, $adminId) {
                $q->where('sender_id', $adminId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark incoming admin messages as read
        Message::where('sender_id', $adminId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'avatar' => $admin->avatar
            ],
            'data' => $messages
        ], 200);
    }
}
