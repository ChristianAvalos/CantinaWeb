<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class Sucursal extends Model
{
    protected $table = 'sucursales';

    protected $fillable = [
        'id_organizacion',
        'nombre',
        'direccion',
        'ciudad_id',
        'telefono',
        'es_principal',
        'id_tipo_estado',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'es_principal' => 'boolean',
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

    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class, 'ciudad_id');
    }

    public function stocks()
    {
        return $this->hasMany(StockSucursal::class, 'id_sucursal');
    }

    /**
     * Sucursal principal de una organización (la que representa a la org
     * cuando no tiene más de una sucursal). Devuelve null si no existe.
     */
    public static function principalDe(?int $idOrganizacion): ?self
    {
        if (! $idOrganizacion) {
            return null;
        }

        return static::where('id_organizacion', $idOrganizacion)
            ->where('es_principal', true)
            ->first();
    }

    /**
     * Devuelve la sucursal principal de la organización, creándola si no existe.
     * Se usa al crear una organización o al asignar datos sin sucursal.
     */
    public static function principalDeOCrear(int $idOrganizacion, ?string $nombre = null): self
    {
        return static::firstOrCreate(
            ['id_organizacion' => $idOrganizacion, 'es_principal' => true],
            [
                'nombre'         => $nombre ?: 'Principal',
                'id_tipo_estado' => 1,
                'UrevUsuario'    => \Illuminate\Support\Facades\Auth::user()?->name ?? 'Sistema',
                'UrevFechaHora'  => now(),
            ]
        );
    }
}
