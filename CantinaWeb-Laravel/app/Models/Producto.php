<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Categorias;
use App\Models\TipoEstado;
use App\Models\Organizacion;
use App\Models\TipoUnidadMedida;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Producto extends Model
{
    use HasFactory;
    protected $table = 'productos';
    protected $fillable = [
        'id_organizacion',
        'codigo_interno',
        'codigo_barras',
        'nombre',
        'descripcion',
        'id_Categoria',
        'cantidad_unidad',
        'id_TipoUnidadMedida',
        'precio_compra',
        'precio_venta',
        'stock_minimo',
        'stock_actual',
        'id_TipoEstado',
        'imagen',
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

    //relacion con unidad de medida
    public function unidadMedida()
    {
        return $this->belongsTo(TipoUnidadMedida::class, 'id_TipoUnidadMedida');
    }
    //relacion con organizacion
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relacion con categoria
    public function categoria()
    {
        return $this->belongsTo(Categorias::class, 'id_Categoria');
    }

    //relacion tipo estado
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_TipoEstado');
    }

}
