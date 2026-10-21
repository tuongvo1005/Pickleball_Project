<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Court;
use App\Models\Product;
use App\Models\Tournament;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Tạo tài khoản mẫu
        User::create([
            'name' => 'Quản Trị Viên',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '0901234567',
            'bio' => 'Quản trị viên hệ thống Pickleball Pro',
        ]);

        User::create([
            'name' => 'Khách Hàng Mẫu',
            'email' => 'user@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'phone' => '0987654321',
            'bio' => 'Người chơi Pickleball đam mê',
        ]);

        User::create([
            'name' => 'HLV Nguyễn Văn Hùng',
            'email' => 'coach1@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'coach',
            'phone' => '0911223344',
            'bio' => 'Huấn luyện viên Pickleball chuẩn quốc tế với 5 năm kinh nghiệm.',
            'hourly_rate' => 250000,
            'experience' => 5,
            'expertise' => 'Kỹ thuật & Chiến thuật',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop',
        ]);

        User::create([
            'name' => 'HLV Trần Thị Thu',
            'email' => 'coach2@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'coach',
            'phone' => '0922334455',
            'bio' => 'Chuyên đào tạo kỹ năng từ cơ bản đến nâng cao cho người mới bắt đầu.',
            'hourly_rate' => 300000,
            'experience' => 7,
            'expertise' => 'Cơ bản đến Nâng cao',
            'avatar' => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=500&auto=format&fit=crop',
        ]);

        User::create([
            'name' => 'HLV Lê Hoàng Nam',
            'email' => 'coach3@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'coach',
            'phone' => '0933445566',
            'bio' => 'Cựu vận động viên chuyên nghiệp, chuyên đào tạo thi đấu giải.',
            'hourly_rate' => 280000,
            'experience' => 4,
            'expertise' => 'Thể lực & Thi đấu',
            'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=500&auto=format&fit=crop',
        ]);

        // 2. Tạo danh sách Sân chơi
        $standardSlots = ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];

        Court::create([
            'name' => 'Sân Pickleball Kỳ Hòa (Quận 10)',
            'type' => 'indoor',
            'price_per_hour' => 150000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        Court::create([
            'name' => 'Sân Pickleball Sala (Quận 2)',
            'type' => 'indoor',
            'price_per_hour' => 200000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        Court::create([
            'name' => 'Sân Pickleball Ngoài Trời Quận 7',
            'type' => 'outdoor',
            'price_per_hour' => 120000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        Court::create([
            'name' => 'Sân Pickleball Tân Bình',
            'type' => 'outdoor',
            'price_per_hour' => 130000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        Court::create([
            'name' => 'Sân Pickleball Bình Thạnh Pro',
            'type' => 'indoor',
            'price_per_hour' => 180000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        Court::create([
            'name' => 'Sân Pickleball Trung Tâm Quận 1',
            'type' => 'indoor',
            'price_per_hour' => 220000,
            'status' => 'active',
            'slots' => $standardSlots,
        ]);

        // 3. Tạo danh sách Sản phẩm
        Product::create([
            'name' => 'Vợt Pickleball Franklin Signature 16mm',
            'description' => 'Vợt chuẩn thi đấu quốc tế, bề mặt sợi carbon gia tăng độ xoáy và kiểm soát bóng.',
            'price' => 1850000,
            'stock' => 20,
            'status' => 'active',
            'image_url' => 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?q=80&w=800&auto=format&fit=crop',
        ]);

        Product::create([
            'name' => 'Vợt Pickleball JOOLA Perseus 3S 16mm',
            'description' => 'Dòng vợt cao cấp của Ben Johns, tối ưu sức mạnh và độ nảy.',
            'price' => 4500000,
            'stock' => 15,
            'status' => 'active',
            'image_url' => 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=800&auto=format&fit=crop',
        ]);

        Product::create([
            'name' => 'Túi Đựng Vợt Pickleball Pro Tour',
            'description' => 'Bao đựng chứa được 4 vợt, có ngăn cách nhiệt và ngăn để giày riêng biệt.',
            'price' => 650000,
            'stock' => 30,
            'status' => 'active',
            'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop',
        ]);

        Product::create([
            'name' => 'Bó Bóng Pickleball Trong Nhà Franklin X-40 (6 quả)',
            'description' => 'Bộ 6 quả bóng thi đấu tiêu chuẩn USAPA độ bền cao.',
            'price' => 250000,
            'stock' => 50,
            'status' => 'active',
            'image_url' => 'https://images.unsplash.com/photo-1613918428409-bc97586ac943?q=80&w=800&auto=format&fit=crop',
        ]);

        Product::create([
            'name' => 'Giày Thi Đấu Pickleball Asics Gel-Resolution 9',
            'description' => 'Giày chuyên dụng chống lật cổ chân và bám sân tối đa.',
            'price' => 2950000,
            'stock' => 10,
            'status' => 'active',
            'image_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
        ]);

        // 4. Tạo giải đấu mẫu
        Tournament::create([
            'name' => 'Giải Pickleball Mở Rộng TP.HCM 2026',
            'description' => 'Giải đấu quy tụ các tay vợt phong trào và bán chuyên xuất sắc nhất khu vực miền Nam.',
            'start_date' => '2026-08-15',
            'end_date' => '2026-08-17',
            'location' => 'Cụm Sân Pickleball Kỳ Hòa, Quận 10',
            'prize' => '50.000.000đ',
            'max_participants' => 16,
            'status' => 'upcoming',
        ]);
    }
}
