<?php

namespace App\Models;

use App\Models\PrecioVenta;
use App\Models\Transacciones;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class TipoMoneda extends Model
{
    protected $table = 'tipo_monedas';
    protected $fillable = [
        'nombre',
        'abreviatura',
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

    //relacion con transacciones
    public function transacciones()
    {
        return $this->hasMany(Transacciones::class, 'id_TipoMoneda');
    }

    //relacion con precio_ventas
    public function precioVentas()
    {
        return $this->hasMany(PrecioVenta::class, 'id_tipo_moneda');
    }
}
