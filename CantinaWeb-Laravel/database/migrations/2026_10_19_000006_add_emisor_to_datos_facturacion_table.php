<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Emisor de comprobantes POR ORGANIZACIÓN.
 *
 * En un SaaS cada inquilino decide si emite impreso o electrónico, y lo cambia
 * cuando quiere. La configuración global (`config/facturacion.php`) queda solo
 * como valor por defecto y para los datos de infraestructura (URL de SIFEN).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datos_facturacion', function (Blueprint $table) {
            $table->string('Emisor', 20)->default('impreso')->after('Ambiente');
        });
    }

    public function down(): void
    {
        Schema::table('datos_facturacion', function (Blueprint $table) {
            $table->dropColumn('Emisor');
        });
    }
};
