<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;

class FormaPago extends Model
{
    protected $table = 'forma_pagos';
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

    //relacion con transacciones
    public function transacciones()
    {
        return $this->hasMany(Transacciones::class, 'id_FormaPago');
    }
}
