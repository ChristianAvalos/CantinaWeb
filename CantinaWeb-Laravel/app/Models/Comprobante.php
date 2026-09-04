<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\User;
use App\Models\Organizacion;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Comprobante extends Model
{
    use HasFactory;
    protected $table = 'comprobantes';
    protected $fillable = [
        'id_transaccion',
        'id_organizacion',
        'datos',
        'id_usuario',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    // El snapshot se guarda/lee como array
    protected $casts = [
        'datos' => 'array',
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

    //relación con la transacción (venta) a la que pertenece
    public function transaccion()
    {
        return $this->belongsTo(Transacciones::class, 'id_transaccion');
    }

    //relación con la organización
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relación con el usuario que generó el comprobante
    public function usuario()
    {
        return $this->belongsTo(User::class, 'id_usuario');
    }
}
