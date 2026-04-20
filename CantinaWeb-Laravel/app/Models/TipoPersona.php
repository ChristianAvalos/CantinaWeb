<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Persona;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TipoPersona extends Model
{
    use HasFactory;
    protected $table = 'tipo_persona';
    protected $fillable = [
        'nombre',
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

    //relacion con personas
    public function personas()
    {
        return $this->hasMany(Persona::class, 'id_tipo_persona');   
    }
}
