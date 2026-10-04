<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Categorias;
use App\Models\TipoEstado;
use App\Models\Organizacion;
use App\Models\Transacciones;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'nameUser',
        'email',
        'password',
        'rol_id',
        'id_organizacion',
        'id_sucursal',
        'id_tipoestado',
        'UrevUsuario',
        'UrevFechaHora'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Relación con el rol.
     */
    public function role()
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    /**
     * Relación con el rol.
     */
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class, 'id_organizacion');
    }

    /**
     * Relación con la sucursal asignada.
     */
    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'id_sucursal');
    }

    /**
     * Devuelve el motivo por el cual el usuario NO puede acceder, o null si
     * puede. Se bloquea si el usuario, su organización o su sucursal están
     * inactivos (estado != 1).
     */
    public function motivoBloqueo(): ?string
    {
        if ($this->id_tipoestado !== null && (int) $this->id_tipoestado !== 1) {
            return 'Tu usuario está inactivo.';
        }

        if ($this->organizacion && $this->organizacion->id_tipoestado !== null
            && (int) $this->organizacion->id_tipoestado !== 1) {
            return 'La organización está inactiva. Contactá al administrador.';
        }

        if ($this->sucursal && $this->sucursal->id_tipo_estado !== null
            && (int) $this->sucursal->id_tipo_estado !== 1) {
            return 'La sucursal está inactiva. Contactá al administrador.';
        }

        return null;
    }

    /**
     * Verifica si el usuario tiene un permiso específico.
     */
    public function hasPermission($permission)
    {
        return $this->role->permissions->contains('name', $permission);
    }


    /**
     * Relación con el TipoEstados.
     */
    public function tipoEstado()
    {
        return $this->belongsTo(TipoEstado::class, 'id_tipoestado');
    }

    /**
     * Relacion con categorías
     */
    public function categorias()
    {
        return $this->hasMany(Categorias::class, 'id_usuario');
    }
    /**
     * Relacion con transacciones
     */
    public function transaccion()
    {
        return $this->hasMany(Transacciones::class, 'id_usuario');  
    }
}
