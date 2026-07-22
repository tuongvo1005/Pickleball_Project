<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Thêm cột shipping_details (JSON) nếu chưa có
            if (!Schema::hasColumn('orders', 'shipping_details')) {
                $table->json('shipping_details')->nullable()->after('total_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'shipping_details')) {
                $table->dropColumn('shipping_details');
            }
        });
    }
};
