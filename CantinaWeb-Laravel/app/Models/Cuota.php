<?php

namespace App\Models;

use App\Models\TipoEstado;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Cuota extends Model
{
    use HasFactory;

    protected $table = 'cuotas';

    protected $fillable = [
        'id_transaccion',
        'numero',
        'monto',
        'fecha_vencimiento',
        'id_TipoEstado',
        'fecha_pago',
        'UrevUsuario',
        'UrevFechaHora'
    ];

    protected $casts = [
        'fecha_vencimiento' => 'date',
        'fecha_pago' => 'date',
        'monto' => 'float'
    ];

    // Relación con la transacción (compra o venta a crédito/cuotas)
    public function transaccion()
    {
        return $this->belongsTo(Transacciones::class, 'id_transaccion');
    }

    // Relación con el tipo de estado (Pendiente / Finalizado)
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_TipoEstado');
    }
}
