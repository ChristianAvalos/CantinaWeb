<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\User;
use App\Models\Cajas;
use App\Models\Bancos;
use App\Models\Persona;
use App\Models\TipoPago;
use App\Models\FormaPago;
use App\Models\Categorias;
use App\Models\TipoEstado;
use App\Models\TipoMoneda;
use App\Models\Organizacion;
use App\Models\TipoComprobante;
use App\Models\TipoMovimientos;
use App\Models\TransaccionesDetalle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transacciones extends Model
{
    use HasFactory;
    protected $table = 'transacciones';
    protected $fillable = [
        'id_organizacion',
        'nombre',
        'id_TipoMovimiento',
        'id_TipoEstado',
        'id_TipoComprobante',
        'id_TipoPago',
        'id_FormaPago',
        'id_Moneda',
        'id_Caja',
        'id_Banco',
        'monto',
        'id_usuario',
        'id_persona',
        'descripcion',
        'nro_comprobante',
        'lote',
        'fecha',
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
    //relacion con transacciones detalles
    public function transacionDetalles()
    {
        return $this->hasMany(TransaccionesDetalle::class, 'id_transaccion');
    }

    //relacion con tipo movimientos
    public function tipoMovimiento()
    {
        return $this->belongsTo(TipoMovimientos::class, 'id_TipoMovimiento');
    }

    //relacion con tipo estados
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_TipoEstado');
    }
    //relacion con organizacion
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relacion con personas
    public function persona()
    {
        return $this->belongsTo(Persona::class, 'id_persona');
    }
    //relacion con usuarios
    public function usuario()
    {
        return $this->belongsTo(User::class, 'id_usuario');
    }

    //relacion con tipo pagos
    public function tipoPago()
    {
        return $this->belongsTo(TipoPago::class, 'id_TipoPago');
    }

    //relacion con cajas
    public function caja()
    {
        return $this->belongsTo(Cajas::class, 'id_Caja');
    }

    //relacion con forma pagos
    public function formaPago()
    {
        return $this->belongsTo(FormaPago::class, 'id_FormaPago');
    }

    //relacion con tipo comprobantes
    public function tipoComprobante()
    {
        return $this->belongsTo(TipoComprobante::class, 'id_TipoComprobante');
    }
    //relacion con tipo monedas
    public function tipoMoneda()
    {
        return $this->belongsTo(TipoMoneda::class, 'id_Moneda');
    }

    //relacion con bancos
    public function banco()
    {
        return $this->belongsTo(Bancos::class, 'id_Banco');
    }



}
