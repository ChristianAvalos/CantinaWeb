<?php

namespace App\Models;

use Carbon\Carbon;
use App\Models\Pais;
use App\Models\User;
use App\Models\Ciudad;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Organizacion extends Model
{
    use HasFactory;
    protected $table = 'organizacion';
    protected $fillable = [
            'RazonSocial',
            'RUC',
            'Direccion',
            'Ciudad_id',
            'Pais_id',
            'Telefono1',
            'Telefono2',
            'Fax1',
            'Fax2',
            'Email',
            'Sigla',
            'SitioWeb',
            'Imagen',
            'UrevUsuario',
            'UrevFechaHora',
    ];
    protected $appends = ['Telefono', 'Fax','UrevCalc'];
    
    public function getUrevCalcAttribute()
    {
        // Si no hay fecha, devuelve solo el usuario
        if (empty($this->UrevFechaHora)) {
            return $this->UrevUsuario ?? ''; 
        }
        $fechaFormateada = Carbon::parse($this->UrevFechaHora)->format('d/m/Y H:i');

        return "{$this->UrevUsuario} - {$fechaFormateada}";
    }
    
    // Relación con Ciudad
    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class, 'Ciudad_id');
    }
    // Relación con Pais
    public function pais()
    {
        return $this->belongsTo(Pais::class, 'Pais_id');
    }
    // Accesor para Telefono
    public function getTelefonoAttribute()
    {
        $telefono1 = $this->Telefono1 ?? '';
        $telefono2 = $this->Telefono2 ?? '';
        return trim("$telefono1 - $telefono2", ' - ');
    }

    // Accesor para Fax
    public function getFaxAttribute()
    {
        $fax1 = $this->Fax1 ?? '';
        $fax2 = $this->Fax2 ?? '';
        return trim("$fax1 - $fax2", ' - ');
    }
        /**
     * Relación con los usuarios: una organizacion puede tener muchos usuarios.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'id_organizacion');
    }

    //relacion con productos
    public function productos()
    {
        return $this->hasMany(Producto::class, 'id_organizacion');
    }

    //relacion con categorias
    public function categorias()
    {
        return $this->hasMany(Categorias::class, 'id_organizacion');
    }
}
