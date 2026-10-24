<?php

namespace App\Services;

use App\Models\DatosFacturacion;
use Carbon\Carbon;

/**
 * Choques de timbrado dentro de una organización.
 *
 * Un timbrado no puede repetirse (cada registro es una serie con su propio
 * correlativo) y dos timbrados no pueden tener vigencias solapadas: eso
 * permitiría emitir con dos series válidas al mismo tiempo.
 *
 * La base tiene las mismas reglas como constraint (`df_org_timbrado_unique` y
 * `df_vigencia_sin_solape`). Esto las anticipa para poder responder 422 con un
 * mensaje entendible.
 */
class VigenciaTimbradoService
{
    /**
     * @param  array<string, mixed>  $datos  Debe traer Timbrado, TimbradoInicio y TimbradoVencimiento.
     * @return array<string, string>  campo => mensaje; vacío si no hay conflicto.
     */
    public static function conflictos(int $idOrganizacion, array $datos, ?int $exceptoId = null): array
    {
        $otros = DatosFacturacion::query()
            ->where('id_organizacion', $idOrganizacion)
            ->when($exceptoId, fn ($query) => $query->where('id', '!=', $exceptoId))
            ->get(['id', 'Timbrado', 'TimbradoInicio', 'TimbradoVencimiento']);

        $timbrado = trim((string) ($datos['Timbrado'] ?? ''));

        foreach ($otros as $otro) {
            if ($timbrado !== '' && trim((string) $otro->Timbrado) === $timbrado) {
                return ['Timbrado' => "El timbrado {$timbrado} ya está registrado en esta organización. Editá ese registro en lugar de crear uno nuevo."];
            }
        }

        $inicio = self::fechaCorta($datos['TimbradoInicio'] ?? null);
        $fin = self::fechaCorta($datos['TimbradoVencimiento'] ?? null);

        foreach ($otros as $otro) {
            $inicioOtro = $otro->TimbradoInicio?->format('Y-m-d');
            $finOtro = $otro->TimbradoVencimiento?->format('Y-m-d');

            if (! self::vigenciasSolapan($inicio, $fin, $inicioOtro, $finOtro)) {
                continue;
            }

            return ['TimbradoInicio' => sprintf(
                'La vigencia se solapa con el timbrado %s (%s).',
                $otro->Timbrado,
                self::describirVigencia($inicioOtro, $finOtro)
            )];
        }

        return [];
    }

    /** Dos vigencias se pisan si ninguna termina antes de que empiece la otra. */
    private static function vigenciasSolapan(?string $inicioA, ?string $finA, ?string $inicioB, ?string $finB): bool
    {
        $inicioA ??= '0001-01-01';
        $finA ??= '9999-12-31';
        $inicioB ??= '0001-01-01';
        $finB ??= '9999-12-31';

        return $inicioA <= $finB && $inicioB <= $finA;
    }

    private static function fechaCorta(mixed $fecha): ?string
    {
        $fecha = is_string($fecha) ? trim($fecha) : $fecha;

        return $fecha ? Carbon::parse($fecha)->format('Y-m-d') : null;
    }

    private static function describirVigencia(?string $inicio, ?string $fin): string
    {
        $desde = $inicio ? Carbon::parse($inicio)->format('d/m/Y') : 'sin inicio';
        $hasta = $fin ? Carbon::parse($fin)->format('d/m/Y') : 'sin vencimiento';

        return "{$desde} a {$hasta}";
    }
}
