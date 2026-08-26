<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Schema;

trait AplicaFiltrosDinamicos
{
    protected function normalizarFiltros(mixed $filtros): array
    {
        if (is_string($filtros)) {
            $filtrosDecodificados = json_decode($filtros, true);
            $filtros = is_array($filtrosDecodificados) ? $filtrosDecodificados : [];
        }

        return is_array($filtros) ? $filtros : [];
    }

    protected function aplicarFiltrosDinamicos($query, array $filtros, array $skipKeys = [])
    {
        $table = $query->getModel()->getTable();
        $columnas = Schema::getColumnListing($table);
        $skipLookup = array_fill_keys($skipKeys, true);

        foreach ($filtros as $clave => $valor) {
            if (isset($skipLookup[$clave])) {
                continue;
            }

            if ($valor === null || $valor === '') {
                continue;
            }

            if (!in_array($clave, $columnas, true)) {
                continue;
            }

            $tipoColumna = Schema::getColumnType($table, $clave);

            if (in_array($tipoColumna, ['integer', 'bigint', 'smallint', 'decimal', 'float', 'double', 'real'], true)) {
                $query->where($clave, $valor);
                continue;
            }

            if (in_array($tipoColumna, ['date', 'datetime', 'timestamp'], true)) {
                $query->whereDate($clave, $valor);
                continue;
            }

            $query->where($clave, 'ilike', '%' . $valor . '%');
        }

        return $query;
    }
}