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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            // Persona a la que representa esta cuenta (alumno/tutor). La FK se
            // agrega en la migración de `personas`, que se crea después.
            $table->unsignedBigInteger('id_persona')->nullable()->index();
            // Se activa al crear/restablecer con la contraseña por defecto: el
            // usuario debe cambiarla al iniciar sesión.
            $table->boolean('debe_cambiar_password')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
