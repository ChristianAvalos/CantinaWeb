<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TipoUnidadMedida extends Model
{
    use HasFactory;
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

    //relacion con productos
    public function productos()
    {
        return $this->hasMany(Producto::class, 'id_TipoUnidadMedida');
    }
}
