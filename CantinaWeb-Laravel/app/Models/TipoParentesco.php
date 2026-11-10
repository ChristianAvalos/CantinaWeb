<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Catálogo de parentescos del grupo familiar.
 */
class TipoParentesco extends Model
{
    use HasFactory;

    protected $table = 'tipo_parentescos';

    protected $fillable = [
        'nombre',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $appends = ['UrevCalc'];

    public function getUrevCalcAttribute()
    {
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? '';
        }

        return "{$this->UrevUsuario} - " . Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');
    }

    public function vinculos()
    {
        return $this->hasMany(PersonaVinculo::class, 'id_tipo_parentesco');
    }
}
