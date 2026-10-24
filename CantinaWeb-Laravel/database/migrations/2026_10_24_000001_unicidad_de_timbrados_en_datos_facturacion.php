<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Un mismo timbrado no puede repetirse y dos timbrados de la misma organización
 * no pueden tener vigencias solapadas.
 *
 * Por qué en la base y no solo en el formulario:
 *  - El correlativo de comprobantes cuelga de `datos_facturacion`, así que cada
 *    fila es una serie. Dos filas con el mismo timbrado tendrían dos contadores
 *    arrancando de cero y repetirían números del mismo rango autorizado.
 *  - Dos vigencias que se pisan permitirían emitir con dos series vigentes a la
 *    vez, que es justo lo que el versionado por timbrado quiere evitar.
 */
return new class extends Migration
{
    private const TIMBRADO_INDEX = 'df_org_timbrado_unique';

    private const VIGENCIA_CONSTRAINT = 'df_vigencia_sin_solape';

    public function up(): void
    {
        // GiST no soporta `=` sobre bigint sin esta extensión.
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');

        DB::statement(sprintf(
            'CREATE UNIQUE INDEX %s ON datos_facturacion (id_organizacion, "Timbrado")',
            self::TIMBRADO_INDEX
        ));

        // Rango inclusivo: el día de vencimiento todavía es válido. Una fecha
        // nula se toma como abierta, para que tampoco convivan dos timbrados
        // sin vigencia definida (ambos serían válidos para siempre).
        DB::statement(sprintf(
            'ALTER TABLE datos_facturacion ADD CONSTRAINT %s
                EXCLUDE USING gist (
                    id_organizacion WITH =,
                    daterange(
                        COALESCE("TimbradoInicio", \'-infinity\'::date),
                        COALESCE("TimbradoVencimiento", \'infinity\'::date),
                        \'[]\'
                    ) WITH &&
                )',
            self::VIGENCIA_CONSTRAINT
        ));
    }

    public function down(): void
    {
        DB::statement(sprintf(
            'ALTER TABLE datos_facturacion DROP CONSTRAINT IF EXISTS %s',
            self::VIGENCIA_CONSTRAINT
        ));

        DB::statement(sprintf('DROP INDEX IF EXISTS %s', self::TIMBRADO_INDEX));
    }
};
