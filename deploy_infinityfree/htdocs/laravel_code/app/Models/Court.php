<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Booking;
use App\Models\Review;

class Court extends Model
{
    use HasFactory;

    /**
     * Các trường cho phép mass assignment.
     */
    protected $fillable = [
        'name',
        'type',
        'price_per_hour',
        'status',
    ];

    /**
     * Một sân có thể có nhiều lượt đặt (Bookings).
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Một sân có thể nhận nhiều đánh giá (Reviews) thông qua quan hệ Polymorphic.
     */
    public function reviews()
    {
        return $this->morphMany(Review::class, 'reviewable');
    }
}
