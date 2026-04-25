<?php

namespace App\Models;

use App\Models\Organizacion;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pais extends Model
{
    use HasFactory;
    protected $table = 'pais';
    protected $fillable = [
        'Name',
        'GentilicioMasculino',
        'GentilicioFemenino',
        'UrevUsuario',
        'UrevFechaHora',
        'UrevCalc'
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

    //relacion con organizacion
    public function Organizacion()
    {
        return $this->hasMany(Organizacion::class, 'Pais_id');
    }
}
