<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Establecimiento y punto de expedición de cada sucursal.
 *
 * Forman los dos primeros bloques del número de factura (EEE-PPP-NNNNNNN) y son
 * parte del timbrado: cada local físico tiene su punto autorizado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sucursales', function (Blueprint $table) {
            $table->string('establecimiento', 3)->default('001')->after('nombre');
            $table->string('punto_expedicion', 3)->default('001')->after('establecimiento');
        });

        // Cada sucursal necesita su PROPIO punto de expedición: si dos comparten
        // 001-001 generarían los mismos números de factura. Se numeran por
        // organización en el orden en que existen (la principal queda en 001).
        $porOrganizacion = [];
        foreach (DB::table('sucursales')->orderByRaw('es_principal DESC')->orderBy('id')->get() as $sucursal) {
            $org = $sucursal->id_organizacion;
            $porOrganizacion[$org] = ($porOrganizacion[$org] ?? 0) + 1;

            DB::table('sucursales')->where('id', $sucursal->id)->update([
                'establecimiento' => '001',
                'punto_expedicion' => sprintf('%03d', $porOrganizacion[$org]),
            ]);
        }

        // Red de seguridad a nivel de BD: dos sucursales de la misma organización
        // no pueden compartir punto, o emitirían los mismos números.
        Schema::table('sucursales', function (Blueprint $table) {
            $table->unique(
                ['id_organizacion', 'establecimiento', 'punto_expedicion'],
                'suc_punto_expedicion_unico'
            );
        });
    }

    public function down(): void
    {
        // El índice puede no existir si esta migración se aplicó antes de
        // agregarlo (o en bases ya migradas con la versión anterior).
        try {
            Schema::table('sucursales', function (Blueprint $table) {
                $table->dropUnique('suc_punto_expedicion_unico');
            });
        } catch (\Throwable $e) {
            // Sin índice: nada que quitar.
        }

        Schema::table('sucursales', function (Blueprint $table) {
            $table->dropColumn(['establecimiento', 'punto_expedicion']);
        });
    }
};
