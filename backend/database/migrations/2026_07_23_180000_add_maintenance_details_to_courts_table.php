<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('courts', function (Blueprint $table) {
            $table->date('maintenance_start_date')->nullable()->after('status');
            $table->date('maintenance_end_date')->nullable()->after('maintenance_start_date');
            $table->text('maintenance_reason')->nullable()->after('maintenance_end_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courts', function (Blueprint $table) {
            $table->dropColumn(['maintenance_start_date', 'maintenance_end_date', 'maintenance_reason']);
        });
    }
};
