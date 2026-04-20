<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\TipoEstado;
use App\Models\TipoPersona;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Persona extends Model
{
    use HasFactory;
    protected $table = 'personas';
    protected $fillable = [
        'nombre',
        'documento',
        'direccion',
        'telefono',
        'email',
        'id_tipo_persona',
        'id_tipoestado',
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

    //relacion con tipo persona
    public function tipoPersona()
    {
        return $this->belongsTo(TipoPersona::class, 'id_tipo_persona');
    }

    //relacion con transacciones
    public function transacciones()
    {
        return $this->hasMany(Transacciones::class, 'id_persona');
    }
    //realcion con tipo estado
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_tipoestado');
    }

}
