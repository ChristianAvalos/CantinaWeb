<?php

namespace App\Services;

use App\Models\CuentaMovimiento;
use App\Models\Persona;
use App\Models\PersonaVinculo;
use App\Models\Transacciones;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Reglas de negocio de la cuenta corriente del alumno.
 *
 * El saldo se deriva SIEMPRE del libro de movimientos confirmados:
 *   saldo = abonos - cargos
 * Un resultado positivo es saldo a favor; uno negativo, deuda.
 */
class CuentaAlumnoService
{
    /** Dirección contable que corresponde a cada tipo de movimiento. */
    public static function direccionDe(string $tipo): string
    {
        return $tipo === CuentaMovimiento::TIPO_COMPRA
            ? CuentaMovimiento::DIRECCION_CARGO
            : CuentaMovimiento::DIRECCION_ABONO;
    }

    public static function registrar(array $datos): CuentaMovimiento
    {
        $tipo = $datos['tipo'];
        $direccion = $datos['direccion'] ?? self::direccionDe($tipo);

        return CuentaMovimiento::create([
            'id_organizacion' => $datos['id_organizacion'],
            'id_sucursal' => $datos['id_sucursal'] ?? null,
            'id_persona' => $datos['id_persona'],
            'tipo' => $tipo,
            'direccion' => $direccion,
            'monto' => $datos['monto'],
            'id_transaccion' => $datos['id_transaccion'] ?? null,
            'id_persona_pagador' => $datos['id_persona_pagador'] ?? null,
            'id_forma_pago' => $datos['id_forma_pago'] ?? null,
            'estado' => $datos['estado'] ?? CuentaMovimiento::ESTADO_CONFIRMADO,
            'referencia_externa' => $datos['referencia_externa'] ?? null,
            'descripcion' => $datos['descripcion'] ?? null,
            'fecha_hora' => $datos['fecha_hora'] ?? now(),
            'datos_extra' => $datos['datos_extra'] ?? null,
            'UrevUsuario' => $datos['UrevUsuario'] ?? (Auth::user()?->name ?? 'Sistema'),
            'UrevFechaHora' => now(),
        ]);
    }

    /**
     * Registra el cargo de una venta. Es idempotente por transacción: reintentar
     * la venta no duplica la deuda.
     */
    public static function registrarCompra(Transacciones $venta, ?float $monto = null): ?CuentaMovimiento
    {
        if (! $venta->id_persona) {
            return null;
        }

        $yaRegistrada = CuentaMovimiento::where('id_transaccion', $venta->id)
            ->where('tipo', CuentaMovimiento::TIPO_COMPRA)
            ->exists();

        if ($yaRegistrada) {
            return null;
        }

        return self::registrar([
            'id_organizacion' => $venta->id_organizacion,
            'id_sucursal' => $venta->id_sucursal,
            'id_persona' => $venta->id_persona,
            'tipo' => CuentaMovimiento::TIPO_COMPRA,
            'direccion' => CuentaMovimiento::DIRECCION_CARGO,
            'monto' => $monto ?? $venta->monto,
            'id_transaccion' => $venta->id,
            'estado' => CuentaMovimiento::ESTADO_CONFIRMADO,
            'descripcion' => 'Compra N° ' . ($venta->nro_comprobante ?: $venta->id),
            'fecha_hora' => $venta->created_at ?? now(),
        ]);
    }

    /**
     * Revierte la deuda de una venta anulada generando un abono (devolución).
     * No borra el cargo original: el historial conserva ambos movimientos.
     */
    public static function revertirCompra(Transacciones $venta): ?CuentaMovimiento
    {
        $cargo = CuentaMovimiento::where('id_transaccion', $venta->id)
            ->where('tipo', CuentaMovimiento::TIPO_COMPRA)
            ->confirmados()
            ->first();

        if (! $cargo) {
            return null;
        }

        $yaRevertido = CuentaMovimiento::where('id_transaccion', $venta->id)
            ->where('tipo', CuentaMovimiento::TIPO_DEVOLUCION)
            ->where('estado', '!=', CuentaMovimiento::ESTADO_ANULADO)
            ->exists();

        if ($yaRevertido) {
            return null;
        }

        return self::registrar([
            'id_organizacion' => $venta->id_organizacion,
            'id_sucursal' => $venta->id_sucursal,
            'id_persona' => $venta->id_persona,
            'tipo' => CuentaMovimiento::TIPO_DEVOLUCION,
            'direccion' => CuentaMovimiento::DIRECCION_ABONO,
            'monto' => $cargo->monto,
            'id_transaccion' => $venta->id,
            'estado' => CuentaMovimiento::ESTADO_CONFIRMADO,
            'descripcion' => 'Anulación de la compra N° ' . ($venta->nro_comprobante ?: $venta->id),
            'fecha_hora' => now(),
        ]);
    }

    public static function saldo(int $idPersona, ?int $idOrganizacion = null): float
    {
        $base = CuentaMovimiento::query()
            ->where('id_persona', $idPersona)
            ->confirmados()
            ->when($idOrganizacion, fn ($q) => $q->where('id_organizacion', $idOrganizacion));

        $cargos = (float) (clone $base)->where('direccion', CuentaMovimiento::DIRECCION_CARGO)->sum('monto');
        $abonos = (float) (clone $base)->where('direccion', CuentaMovimiento::DIRECCION_ABONO)->sum('monto');

        return round($abonos - $cargos, 4);
    }

    /**
     * Resumen para la pantalla: saldo actual, deuda, saldo a favor y totales.
     */
    public static function resumen(Persona $persona): array
    {
        $base = CuentaMovimiento::query()
            ->where('id_persona', $persona->id)
            ->confirmados();

        $cargos = (float) (clone $base)->where('direccion', CuentaMovimiento::DIRECCION_CARGO)->sum('monto');
        $abonos = (float) (clone $base)->where('direccion', CuentaMovimiento::DIRECCION_ABONO)->sum('monto');
        $saldo = round($abonos - $cargos, 4);

        return [
            'saldo' => $saldo,
            'deuda' => round(max(0, -$saldo), 4),
            'saldo_favor' => round(max(0, $saldo), 4),
            'total_comprado' => round($cargos, 4),
            'total_pagado' => round($abonos, 4),
            'pagos_pendientes' => (float) CuentaMovimiento::where('id_persona', $persona->id)
                ->pendientes()
                ->sum('monto'),
        ];
    }

    /**
     * Alumnos a los que el usuario puede acceder desde el portal.
     *
     * Incluye su propia persona (si es alumno) y cada alumno con vínculo vigente.
     * Devuelve el permiso efectivo por alumno, ya que un mismo tutor podría tener
     * permisos distintos con cada hijo.
     */
    public static function alumnosAccesibles(User $user): array
    {
        if (! $user->id_persona || ! $user->id_organizacion) {
            return [];
        }

        $accesos = [];
        $propia = Persona::whereKey($user->id_persona)
            ->where('id_organizacion', $user->id_organizacion)
            ->first();

        // La propia persona se incluye solo si es alumno. Un tutor puro no debe
        // ver una "cuenta" vacía a su nombre en el selector de hijos.
        $propiaEsTutor = $propia?->vinculosComoTutor()->exists() ?? false;
        $propiaEsAlumno = $propia && self::esCuentaDeAlumno($propia);

        if ($propia && (! $propiaEsTutor || $propiaEsAlumno)) {
            $accesos[$propia->id] = [
                'persona' => $propia,
                'parentesco' => 'Titular',
                'permisos' => [
                    'puede_ver_compras' => true,
                    'puede_ver_saldo' => true,
                    'puede_pagar' => true,
                ],
            ];
        }

        $vinculos = PersonaVinculo::with('alumno')
            ->vigentes()
            ->where('id_tutor', $user->id_persona)
            ->where('id_organizacion', $user->id_organizacion)
            ->get();

        foreach ($vinculos as $vinculo) {
            $alumno = $vinculo->alumno;

            if (! $alumno || (int) $alumno->id_organizacion !== (int) $user->id_organizacion) {
                continue;
            }

            $permisos = [
                'puede_ver_compras' => (bool) $vinculo->puede_ver_compras,
                'puede_ver_saldo' => (bool) $vinculo->puede_ver_saldo,
                'puede_pagar' => (bool) $vinculo->puede_pagar,
            ];

            if (isset($accesos[$alumno->id])) {
                // Titular y tutor a la vez: se conserva el permiso más amplio.
                foreach ($permisos as $clave => $valor) {
                    $accesos[$alumno->id]['permisos'][$clave] =
                        $accesos[$alumno->id]['permisos'][$clave] || $valor;
                }
                continue;
            }

            $accesos[$alumno->id] = [
                'persona' => $alumno,
                'parentesco' => $vinculo->parentesco ?: 'Tutor',
                'permisos' => $permisos,
            ];
        }

        return array_values($accesos);
    }

    /** ¿La persona tiene señales de ser alumno (tipo, movimientos o vínculos)? */
    private static function esCuentaDeAlumno(Persona $persona): bool
    {
        $persona->loadMissing('tipoPersona');

        $esTipoAlumno = $persona->tipoPersona
            && mb_strtolower(trim((string) $persona->tipoPersona->nombre)) === 'alumno';

        return $esTipoAlumno
            || $persona->cuentaMovimientos()->exists()
            || $persona->vinculosComoAlumno()->exists();
    }

    /**
     * Acceso concreto a un alumno, o null si no está vinculado.
     */
    public static function accesoA(User $user, int $idAlumno): ?array
    {
        foreach (self::alumnosAccesibles($user) as $acceso) {
            if ((int) $acceso['persona']->id === $idAlumno) {
                return $acceso;
            }
        }

        return null;
    }
}
