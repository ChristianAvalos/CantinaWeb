<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Datos fiscales con los que se emiten los comprobantes.
 *
 * Se versionan: solo uno activo por organización y los anteriores quedan como
 * histórico, porque las facturas ya emitidas conservan los datos con los que
 * nacieron.
 */
class DatosFacturacion extends Model
{
    protected $table = 'datos_facturacion';

    public const AMBIENTE_TEST = 'test';
    public const AMBIENTE_PRODUCCION = 'produccion';

    /** Emisores disponibles. Cada organización elige el suyo. */
    public const EMISOR_IMPRESO = 'impreso';
    public const EMISOR_SIFEN = 'sifen';
    public const EMISORES = [self::EMISOR_IMPRESO, self::EMISOR_SIFEN];

    protected $fillable = [
        'id_organizacion',
        'activo',
        'RUC',
        'RazonSocial',
        'DireccionFiscal',
        'Telefono',
        'Email',
        'ActividadEconomica',
        'ActividadEconomicaCodigo',
        'Timbrado',
        'TimbradoInicio',
        'TimbradoVencimiento',
        'Ambiente',
        'Emisor',
        'UrevUsuario',
        'UrevFechaHora',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'TimbradoInicio' => 'date',
        'TimbradoVencimiento' => 'date',
        'UrevFechaHora' => 'datetime',
    ];

    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    public function secuencias()
    {
        return $this->hasMany(ComprobanteSecuencia::class, 'id_datos_facturacion');
    }

    /** El registro fiscal vigente de una organización. */
    public static function activoDe(?int $idOrganizacion): ?self
    {
        if (! $idOrganizacion) {
            return null;
        }

        return static::where('id_organizacion', $idOrganizacion)
            ->where('activo', true)
            ->latest('id')
            ->first();
    }

    /** ¿Tiene timbrado cargado y vigente a la fecha? Habilita emitir facturas. */
    public function timbradoVigente(?Carbon $fecha = null): bool
    {
        if (empty($this->Timbrado)) {
            return false;
        }

        $fecha = $fecha ?? Carbon::now();

        if ($this->TimbradoInicio && $fecha->lt($this->TimbradoInicio->startOfDay())) {
            return false;
        }

        if ($this->TimbradoVencimiento && $fecha->gt($this->TimbradoVencimiento->endOfDay())) {
            return false;
        }

        return true;
    }

    /** Deja este registro como el único activo de su organización. */
    public function activar(): void
    {
        static::where('id_organizacion', $this->id_organizacion)
            ->where('id', '!=', $this->id)
            ->update(['activo' => false]);

        $this->activo = true;
        $this->save();
    }
}
