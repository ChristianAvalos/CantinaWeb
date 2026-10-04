<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockSucursal extends Model
{
    protected $table = 'stock_sucursal';

    protected $fillable = [
        'id_producto',
        'id_sucursal',
        'stock_actual',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'stock_actual' => 'decimal:4',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto');
    }

    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'id_sucursal');
    }
}
