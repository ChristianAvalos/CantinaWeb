<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrecioVenta extends Model
{
    use HasFactory;
    protected $table = 'precio_venta';
    protected $fillable = [
        'id_organizacion',
        'id_producto',
        'id_tipoestado',
        'id_tipo_moneda',
        'UrevUsuario',
        'UrevFechaHora',
        'UrevCalc',
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

    // Relación con Organizacion
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }

    // Relación con TipoEstado
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_tipoestado');
    }

    // Relación con TipoMoneda
    public function tipoMoneda()
    {
        return $this->belongsTo(TipoMoneda::class, 'id_tipo_moneda');
    }
    


}
