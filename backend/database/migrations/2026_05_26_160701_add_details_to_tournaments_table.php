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
        Schema::table('tournaments', function (Blueprint $table) {
            $table->string('location')->nullable()->after('end_date');
            $table->string('prize')->nullable()->after('location');
            $table->integer('max_participants')->nullable()->after('prize');
            $table->string('status')->default('upcoming')->after('max_participants');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['location', 'prize', 'max_participants', 'status']);
        });
    }
};
