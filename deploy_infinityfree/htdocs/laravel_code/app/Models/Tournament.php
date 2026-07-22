<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Carbon\Carbon;

class Tournament extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'location',
        'prize',
        'max_participants',
        'status',
    ];

    /**
     * Tự động tính toán trạng thái giải đấu theo ngày hiện tại
     */
    protected function status(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$this->start_date || !$this->end_date) {
                    return $value ?: 'upcoming';
                }

                try {
                    $today = Carbon::today();
                    $start = Carbon::parse($this->start_date)->startOfDay();
                    $end = Carbon::parse($this->end_date)->endOfDay();

                    if ($today->lt($start)) {
                        return 'upcoming';
                    } elseif ($today->gt($end)) {
                        return 'finished';
                    } else {
                        return 'ongoing';
                    }
                } catch (\Exception $e) {
                    return $value ?: 'upcoming';
                }
            }
        );
    }

    /**
     * Lấy danh sách người chơi (users) đã đăng ký tham gia giải đấu này
     * Quan hệ Nhiều - Nhiều (Many-to-Many) thông qua bảng trung gian tournament_participants
     */
    public function participants()
    {
        return $this->belongsToMany(User::class, 'tournament_participants', 'tournament_id', 'user_id')->withTimestamps();
    }
}
