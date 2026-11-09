<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Movimiento del libro de cuenta corriente del alumno.
 *
 * El saldo NO se guarda: se calcula como
 *   abonos confirmados - cargos confirmados.
 * Los movimientos en estado distinto de `confirmado` no impactan el saldo
 * (así un pago pendiente de la pasarela no genera crédito antes de cobrarse).
 */
class CuentaMovimiento extends Model
{
    use HasFactory;

    public const TIPO_COMPRA = 'compra';
    public const TIPO_PAGO = 'pago';
    public const TIPO_RECARGA = 'recarga';
    public const TIPO_AJUSTE = 'ajuste';
    public const TIPO_DEVOLUCION = 'devolucion';

    public const DIRECCION_CARGO = 'cargo';
    public const DIRECCION_ABONO = 'abono';

    public const ESTADO_PENDIENTE = 'pendiente';
    public const ESTADO_CONFIRMADO = 'confirmado';
    public const ESTADO_RECHAZADO = 'rechazado';
    public const ESTADO_ANULADO = 'anulado';

    protected $table = 'cuenta_movimientos';

    protected $fillable = [
        'id_organizacion',
        'id_sucursal',
        'id_persona',
        'tipo',
        'direccion',
        'monto',
        'id_transaccion',
        'id_persona_pagador',
        'id_forma_pago',
        'estado',
        'referencia_externa',
        'descripcion',
        'fecha_hora',
        'datos_extra',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'monto' => 'decimal:4',
        'fecha_hora' => 'datetime',
        'datos_extra' => 'array',
    ];

    protected $appends = ['UrevCalc'];

    public function getUrevCalcAttribute()
    {
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? '';
        }

        return "{$this->UrevUsuario} - " . Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');
    }

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'id_sucursal');
    }

    /** Titular de la cuenta (alumno). */
    public function persona()
    {
        return $this->belongsTo(Persona::class, 'id_persona');
    }

    /** Quién pagó (tutor o el propio alumno). */
    public function pagador()
    {
        return $this->belongsTo(Persona::class, 'id_persona_pagador');
    }

    public function transaccion()
    {
        return $this->belongsTo(Transacciones::class, 'id_transaccion');
    }

    public function formaPago()
    {
        return $this->belongsTo(FormaPago::class, 'id_forma_pago');
    }

    public function scopeConfirmados($query)
    {
        return $query->where('estado', self::ESTADO_CONFIRMADO);
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }

    public function esCargo(): bool
    {
        return $this->direccion === self::DIRECCION_CARGO;
    }

    /** Efecto sobre el saldo (positivo = a favor, negativo = deuda). */
    public function efectoSaldo(): float
    {
        return $this->esCargo() ? -((float) $this->monto) : (float) $this->monto;
    }
}
