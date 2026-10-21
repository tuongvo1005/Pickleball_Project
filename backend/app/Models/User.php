<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Các trường cho phép mass assignment.
     */
    protected $fillable = [
        'name',
        'email',
        'avatar',
        'password',
        'phone',
        'role',
        'is_locked',
        'bio',
        'hourly_rate',
        'experience',
        'expertise',
    ];

    /**
     * Các trường bị ẩn khi trả về JSON.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Ép kiểu dữ liệu.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_locked' => 'boolean',
    ];

    /**
     * Một user (khách) có thể có nhiều lượt đặt sân.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'user_id');
    }

    /**
     * Nếu user là HLV, họ có thể nhận nhiều lượt đặt từ học viên.
     */
    public function coachBookings()
    {
        return $this->hasMany(Booking::class, 'coach_id');
    }
}
