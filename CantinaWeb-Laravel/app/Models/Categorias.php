<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\User;
use App\Models\Producto;
use App\Models\Organizacion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Categorias extends Model
{
    use HasFactory;
    protected $table = 'categorias';
    protected $fillable = [
        'id_organizacion',
        'nombre',
        'UrevUsuario',
        'UrevFechaHora',
        'UrevCalc',
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

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relacion con productos
    public function productos()
    {
        return $this->hasMany(Producto::class, 'id_Categoria');
    }
}
