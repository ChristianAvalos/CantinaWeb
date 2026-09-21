<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Organizacion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TipoMovimientos extends Model
{
    use HasFactory;

    protected $table = 'tipo_movimientos';

    /**
     * Ámbito de la fila:
     * - documento:  tipo de DOCUMENTO que se guarda en transacciones (Compra, Venta, Ajuste).
     * - inventario: tipo de MOVIMIENTO de stock que se guarda en el kardex (101, 201...).
     */
    public const AMBITO_DOCUMENTO  = 'documento';
    public const AMBITO_INVENTARIO = 'inventario';

    /** Dirección del movimiento de inventario. */
    public const DIRECCION_ENTRADA = 'entrada';
    public const DIRECCION_SALIDA  = 'salida';

    protected $fillable = [
        'id_organizacion',
        'nombre',
        'codigo',
        'ambito',
        'direccion',
        'id_tipo_movimiento_documento',
        'UrevUsuario',
        'UrevFechaHora'
    ];

    protected $appends = ['UrevCalc'];

    public function getUrevCalcAttribute()
    {
        // Si no hay fecha, devuelve solo el usuario
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? ''; 
        }
        $fechaFormateada = Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');

        return "{$this->UrevUsuario} - {$fechaFormateada}";
    }

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    /** Tipo de DOCUMENTO al que pertenece un movimiento de inventario (101 → Compra). */
    public function tipoMovimientoDocumento()
    {
        return $this->belongsTo(TipoMovimientos::class, 'id_tipo_movimiento_documento');
    }

    /** Movimientos de inventario que pertenecen a este tipo de documento. */
    public function movimientosInventario()
    {
        return $this->hasMany(TipoMovimientos::class, 'id_tipo_movimiento_documento');
    }

    /** Filas del kardex que usan este tipo de movimiento. */
    public function movimientosHistorial()
    {
        return $this->hasMany(MovimientoHistorial::class, 'id_TipoMovimiento');
    }

    /** Solo los tipos de documento (Compra, Venta, Ajuste). */
    public function scopeDocumento($query)
    {
        return $query->where('ambito', self::AMBITO_DOCUMENTO);
    }

    /** Solo los tipos de movimiento de inventario (101, 201...). */
    public function scopeInventario($query)
    {
        return $query->where('ambito', self::AMBITO_INVENTARIO);
    }

    public function esEntrada(): bool
    {
        return $this->direccion === self::DIRECCION_ENTRADA;
    }
}
