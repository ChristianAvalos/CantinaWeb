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
        'precio_unitario',
        'subtotal',
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

