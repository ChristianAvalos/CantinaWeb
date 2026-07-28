<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Producto;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class   TransaccionesDetalle extends Model
{
    use HasFactory;
    protected $table = 'transacciones_detalles';
    protected $fillable = [
        'id_transaccion',
        'id_producto',
        'cantidad',
        'lote',
        'fecha_vencimiento',
        'precio_unitario',
        'subtotal',
        'UrevUsuario',
        'UrevFechaHora'
    ];

    protected $appends = ['UrevCalc', 'cantidad_vendida', 'cantidad_minima'];

    public function getUrevCalcAttribute()
    {
        // Si no hay fecha, devuelve solo el usuario
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? ''; 
        }
        $fechaFormateada = Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');

        return "{$this->UrevUsuario} - {$fechaFormateada}";
    }

    /**
     * Total de unidades vendidas de este producto en todas las transacciones.
     */
    public function getCantidadVendidaAttribute(): float
    {
        return (float) self::where('id_producto', $this->id_producto)
            ->whereHas('transaccion', function ($query) {
                $query->where('id_TipoMovimiento', 2); // ventas
            })
            ->sum('cantidad');
    }

    /**
     * Cantidad mínima permitida para este detalle de compra,
     * considerando que otras compras del mismo producto también aportan stock.
     * Fórmula: max(0, totalVendido - otrasCompras)
     * donde otrasCompras = totalComprado - cantidadDeEsteDetalle
     */
    public function getCantidadMinimaAttribute(): float
    {
        $totalComprado = (float) self::where('id_producto', $this->id_producto)
            ->whereHas('transaccion', function ($query) {
                $query->where('id_TipoMovimiento', 1); // compras
            })
            ->sum('cantidad');

        $totalVendido = (float) self::where('id_producto', $this->id_producto)
            ->whereHas('transaccion', function ($query) {
                $query->where('id_TipoMovimiento', 2); // ventas
            })
            ->sum('cantidad');

        $otrasCompras = $totalComprado - (float) $this->cantidad;

        return max(0, $totalVendido - $otrasCompras);
    }
    //relacion con transacciones
    public function transaccion()
    {
        return $this->belongsTo(Transacciones::class, 'id_transaccion');
    }

    //relacion con productos
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }


}

