<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Ciudad;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Departamento extends Model
{
    use HasFactory;
    protected $table = 'departamento';
    protected $fillable = [
        'nombre',
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



    public function ciudades()
    {
        return $this->hasMany(Ciudad::class, 'departamento_id');
    }
}
