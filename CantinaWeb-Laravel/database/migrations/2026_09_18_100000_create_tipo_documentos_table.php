<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tipo_documentos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50);
            // Formato de ingreso/visualización del documento:
            // miles = separador de miles (C.I.), ruc = base + dígito verificador, libre = tal cual se escribe
            $table->string('formato', 20)->default('libre');
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tipo_documentos');
    }
};
