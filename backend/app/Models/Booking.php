<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'court_id',
        'coach_id',
        'booking_date',
        'start_time',
        'end_time',
        'total_price',
        'payment_status',
        'status',
        'notes',
    ];

    /**
     * Lượt đặt thuộc về Khách hàng nào
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Lượt đặt tại Sân nào (có thể null nếu chỉ thuê HLV)
     */
    public function court()
    {
        return $this->belongsTo(Court::class, 'court_id');
    }

    /**
     * Lượt đặt được hướng dẫn bởi HLV nào (có thể null nếu chỉ thuê Sân)
     */
    public function coach()
    {
        return $this->belongsTo(User::class, 'coach_id');
    }
}
