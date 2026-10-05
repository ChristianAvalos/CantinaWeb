<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoEstadoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            'Activo',
            'Inactivo',
            'Finalizado',
            'Pendiente',
            'Positivo',
            'Negativo',
            'Anulada'
        ];

        $now = Carbon::now();

        // Catálogo global: id_organizacion = null para que lo vean todas las
        // organizaciones (TipoEstadoController filtra whereNull(id_organizacion)
        // OR id_organizacion = <org del usuario>).
        // Normaliza filas heredadas de versiones previas, que quedaron ligadas
        // a la organización 1, para reutilizarlas en vez de duplicarlas.
        DB::table('tipo_estados')
            ->where('id_organizacion', 1)
            ->whereIn('descripcion', $registros)
            ->update(['id_organizacion' => null, 'updated_at' => $now]);

        // updateOrInsert por descripcion: re-ejecutar no duplica.
        foreach ($registros as $nombre) {
            DB::table('tipo_estados')->updateOrInsert(
                ['id_organizacion' => null, 'descripcion' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
