<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'items',
        'total_amount',
        'status',
    ];

    /**
     * Tự động ép kiểu cột items từ JSON text trong MySQL thành Array trong PHP
     */
    protected $casts = [
        'items' => 'array',
    ];

    /**
     * Đơn hàng thuộc về Khách hàng nào
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
