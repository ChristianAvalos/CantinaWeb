<?php

namespace App\Models;

use App\Models\Producto;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * KARDEX. Cada fila es un movimiento de stock (entrada o salida).
 *
 * El stock de un producto es la suma algebraica de sus movimientos:
 *   stock = SUM(direccion = 'entrada' ? cantidad : -cantidad)
 *
 * Esa suma debe coincidir SIEMPRE con `productos.stock_actual`.
 */
class MovimientoHistorial extends Model
{
    use HasFactory;

    protected $table = 'movimiento_historial';

    protected $fillable = [
        'id_organizacion',
        'id_producto',
        'producto_codigo',
        'producto_nombre',
        'id_TipoMovimiento',
        'direccion',
        'cantidad',
        'costo_unitario',
        'stock_anterior',
        'stock_nuevo',
        'id_transaccion',
        'id_transaccion_detalle',
        'id_movimiento_origen',
        'motivo',
        'referencia',
        'fecha',
        'id_usuario',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'cantidad'       => 'decimal:4',
        'costo_unitario' => 'decimal:4',
        'stock_anterior' => 'decimal:4',
        'stock_nuevo'    => 'decimal:4',
        'fecha'          => 'datetime',
        'UrevFechaHora'  => 'datetime',
    ];

    protected $appends = ['UrevCalc'];

    public function getUrevCalcAttribute()
    {
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? '';
        }

        return "{$this->UrevUsuario} - " . Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');
    }

    /** Cantidad con signo: positiva si entra, negativa si sale. */
    public function getCantidadFirmadaAttribute(): float
    {
        $cantidad = (float) $this->cantidad;

        return $this->direccion === TipoMovimientos::DIRECCION_ENTRADA ? $cantidad : -$cantidad;
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }

    /** Tipo de movimiento del catálogo unificado (fila con ambito = inventario). */
    public function tipoMovimiento()
    {
        return $this->belongsTo(TipoMovimientos::class, 'id_TipoMovimiento');
    }

    public function transaccion()
    {
        return $this->belongsTo(Transacciones::class, 'id_transaccion');
    }

    public function transaccionDetalle()
    {
        return $this->belongsTo(TransaccionesDetalle::class, 'id_transaccion_detalle');
    }

    /** El movimiento que este revierte (si es una reversa). */
    public function movimientoOrigen()
    {
        return $this->belongsTo(MovimientoHistorial::class, 'id_movimiento_origen');
    }

    /** Las reversas que este movimiento tiene registradas. */
    public function reversas()
    {
        return $this->hasMany(MovimientoHistorial::class, 'id_movimiento_origen');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'id_usuario');
    }

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    /** Solo movimientos de entrada. */
    public function scopeEntradas($query)
    {
        return $query->where('direccion', TipoMovimientos::DIRECCION_ENTRADA);
    }

    /** Solo movimientos de salida. */
    public function scopeSalidas($query)
    {
        return $query->where('direccion', TipoMovimientos::DIRECCION_SALIDA);
    }

    /** Un movimiento que NO es reversa (tiene el efecto original). */
    public function scopeOriginales($query)
    {
        return $query->whereNull('id_movimiento_origen');
    }
}
