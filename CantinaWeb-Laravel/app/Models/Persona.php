<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\TipoEstado;
use App\Models\TipoPersona;
use App\Models\TipoDocumento;
use App\Models\Transacciones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Persona extends Model
{
    use HasFactory;
    protected $table = 'personas';
    protected $fillable = [
        'id_organizacion',
        'nombre',
        'documento',
        'direccion',
        'telefono',
        'email',
        'id_tipo_persona',
        'id_tipo_documento',
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

    //relacion con organizacion
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    //relacion con tipo documento (C.I., RUC, ...)
    public function tipoDocumento()
    {
        return $this->belongsTo(TipoDocumento::class, 'id_tipo_documento');
    }

    //relacion con transacciones
    public function transacciones()
    {
        return $this->hasMany(Transacciones::class, 'id_persona');
    }

    // Alumnos vinculados cuando esta persona es tutor.
    public function alumnos()
    {
        return $this->belongsToMany(Persona::class, 'persona_vinculos', 'id_tutor', 'id_alumno')
            ->withPivot(['id_tipo_parentesco', 'puede_ver_compras', 'puede_ver_saldo', 'puede_pagar', 'id_tipoestado', 'fecha_inicio', 'fecha_fin'])
            ->withTimestamps();
    }

    // Tutores vinculados cuando esta persona es alumno.
    public function tutores()
    {
        return $this->belongsToMany(Persona::class, 'persona_vinculos', 'id_alumno', 'id_tutor')
            ->withPivot(['id_tipo_parentesco', 'puede_ver_compras', 'puede_ver_saldo', 'puede_pagar', 'id_tipoestado', 'fecha_inicio', 'fecha_fin'])
            ->withTimestamps();
    }

    public function vinculosComoAlumno()
    {
        return $this->hasMany(PersonaVinculo::class, 'id_alumno');
    }

    public function vinculosComoTutor()
    {
        return $this->hasMany(PersonaVinculo::class, 'id_tutor');
    }

    // Libro de cuenta corriente del alumno.
    public function cuentaMovimientos()
    {
        return $this->hasMany(CuentaMovimiento::class, 'id_persona');
    }
    //realcion con tipo estado
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_tipoestado');
    }

}
