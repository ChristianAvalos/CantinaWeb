<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Vínculo alumno–tutor dentro de una organización.
 *
 * Los permisos se guardan en el vínculo para poder revocar el acceso a un
 * alumno sin afectar a los demás hijos del mismo tutor.
 */
class PersonaVinculo extends Model
{
    use HasFactory;

    protected $table = 'persona_vinculos';

    protected $fillable = [
        'id_organizacion',
        'id_alumno',
        'id_tutor',
        'parentesco',
        'puede_ver_compras',
        'puede_ver_saldo',
        'puede_pagar',
        'id_tipoestado',
        'fecha_inicio',
        'fecha_fin',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'puede_ver_compras' => 'boolean',
        'puede_ver_saldo' => 'boolean',
        'puede_pagar' => 'boolean',
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
    ];

    protected $appends = ['UrevCalc'];

    public function getUrevCalcAttribute()
    {
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? '';
        }

        return "{$this->UrevUsuario} - " . Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');
    }

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    public function alumno()
    {
        return $this->belongsTo(Persona::class, 'id_alumno');
    }

    public function tutor()
    {
        return $this->belongsTo(Persona::class, 'id_tutor');
    }

    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_tipoestado');
    }

    /** Vínculo vigente: activo y sin fecha de fin vencida. */
    public function scopeVigentes($query)
    {
        return $query->where('id_tipoestado', 1)
            ->where(function ($q) {
                $q->whereNull('fecha_fin')->orWhereDate('fecha_fin', '>=', now()->toDateString());
            });
    }

    public function estaVigente(): bool
    {
        return (int) $this->id_tipoestado === 1
            && (empty($this->fecha_fin) || $this->fecha_fin->greaterThanOrEqualTo(now()->startOfDay()));
    }
}
