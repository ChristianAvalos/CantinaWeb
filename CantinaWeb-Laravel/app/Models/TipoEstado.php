<?php

namespace App\Models;

use App\Models\Organizacion;
use App\Models\Persona;
use App\Models\PrecioVenta;
use App\Models\Producto;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoEstado extends Model
{
    use HasFactory;
    protected $fillable = [
        'id_organizacion',
        'descripcion',
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




    /**
     * Relación con los usuarios: un estado puede tener muchos usuarios.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'id_tipoestado');
    }

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relacion con productos
    public function productos()
    {
        return $this->hasMany(Producto::class, 'id_TipoEstado');
    }

    //relacion con personas
    public function personas()
    {
        return $this->hasMany(Persona::class, 'id_tipoestado');
    }

    //relacion con precio_ventas
    public function precioVentas()
    {
        return $this->hasMany(PrecioVenta::class, 'id_tipoestado');
    }
}
