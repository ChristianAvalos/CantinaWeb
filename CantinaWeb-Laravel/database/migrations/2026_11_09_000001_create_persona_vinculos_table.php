<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vínculo entre el alumno (titular de la cuenta) y sus padres/tutores.
 *
 * Es muchos-a-muchos: un alumno puede tener varios tutores y un tutor varios
 * alumnos. Los permisos viven en el vínculo, no en el usuario, para poder
 * revocar el acceso a un hijo sin afectar a los demás.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('persona_vinculos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            $table->unsignedBigInteger('id_alumno');
            $table->unsignedBigInteger('id_tutor');
            // Catálogo `tipo_parentescos` (Papá, Mamá, Tutor, ...).
            $table->unsignedBigInteger('id_tipo_parentesco')->nullable();
            $table->boolean('puede_ver_compras')->default(true);
            $table->boolean('puede_ver_saldo')->default(true);
            $table->boolean('puede_pagar')->default(true);
            // 1: Activo, 2: Inactivo (mismo catálogo que personas/usuarios).
            $table->unsignedBigInteger('id_tipoestado')->default(1);
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            // Un tutor no se vincula dos veces con el mismo alumno.
            $table->unique(['id_alumno', 'id_tutor']);
            $table->index(['id_organizacion', 'id_tutor']);

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
            $table->foreign('id_alumno')->references('id')->on('personas')->cascadeOnDelete();
            $table->foreign('id_tutor')->references('id')->on('personas')->cascadeOnDelete();
            $table->foreign('id_tipoestado')->references('id')->on('tipo_estados');
            $table->foreign('id_tipo_parentesco')->references('id')->on('tipo_parentescos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('persona_vinculos');
    }
};
