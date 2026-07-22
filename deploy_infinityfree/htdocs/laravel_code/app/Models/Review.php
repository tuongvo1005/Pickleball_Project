<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reviewable_type',
        'reviewable_id',
        'rating',
        'comment',
    ];

    /**
     * Lấy thông tin người viết đánh giá
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Quan hệ Đa hình (Polymorphic)
     * Giúp trả về model cha tương ứng (Sân hoặc HLV)
     */
    public function reviewable()
    {
        return $this->morphTo();
    }
}
