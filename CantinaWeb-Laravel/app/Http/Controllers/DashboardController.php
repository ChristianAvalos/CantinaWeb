<?php

namespace App\Http\Controllers;

use App\Models\Categorias;
use App\Models\Cuota;
use App\Models\MovimientoHistorial;
use App\Models\Organizacion;
use App\Models\Persona;
use App\Models\PrecioVenta;
use App\Models\Producto;
use App\Models\Role;
use App\Models\TipoEstado;
use App\Models\TipoMovimientos;
use App\Models\Transacciones;
use App\Models\User;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class DashboardController extends Controller
{
    use PerteneceAOrganizacion;

    /**
     * Contadores del panel, acotados al ámbito del usuario.
     *
     * Cada contador respeta el mismo alcance que su listado: la organización y,
     * si el usuario tiene sucursal asignada, también la sucursal. El
     * Administrador de Sistema ve los totales globales y, además, los datos de
     * sistema (organizaciones, usuarios y roles), que no se exponen al resto.
     */
    public function contadores()
    {
        $esAdminSistema = $this->esAdminSistema();
        $idOrganizacion = $this->organizacionDelUsuario();
        $idSucursal = $this->sucursalDelUsuario();

        // Acota una consulta al ámbito del usuario.
        $scope = function ($query, bool $conSucursal = false) use ($esAdminSistema, $idOrganizacion, $idSucursal) {
            if ($esAdminSistema) {
                return $query;
            }

            $query->where('id_organizacion', $idOrganizacion);

            if ($conSucursal && ! empty($idSucursal)) {
                $query->where('id_sucursal', $idSucursal);
            }

            return $query;
        };

        $idEstadoPendiente = TipoEstado::where('descripcion', 'Pendiente')->value('id');

        // Cuotas pendientes según el tipo de documento: por cobrar (ventas a
        // crédito) y por pagar (compras a crédito).
        $cuotasPendientes = function ($idTipoMovimiento) use ($scope, $idEstadoPendiente) {
            if (! $idEstadoPendiente) {
                return 0;
            }

            return Cuota::where('id_TipoEstado', $idEstadoPendiente)
                ->whereHas('transaccion', fn ($q) => $scope($q, true)->where('id_TipoMovimiento', $idTipoMovimiento))
                ->count();
        };

        $contadores = [
            'productos'                    => $scope(Producto::query())->count(),
            'personas'                     => $scope(Persona::query())->count(),
            'precios_venta'                => $scope(PrecioVenta::query())->count(),
            'transacciones'                => $scope(Transacciones::query(), true)->count(),
            'movimientos'                  => $scope(MovimientoHistorial::query())->count(),
            // Las categorías compartidas (id_organizacion null, del seeder)
            // también cuentan para las organizaciones.
            'categorias'                   => $esAdminSistema
                ? Categorias::count()
                : Categorias::where(function ($q) use ($idOrganizacion) {
                    $q->whereNull('id_organizacion')
                        ->orWhere('id_organizacion', $idOrganizacion);
                })->count(),
            'cobranzas_pendientes'         => $cuotasPendientes(TipoMovimientos::DOCUMENTO_VENTA),
            'pagos_proveedores_pendientes' => $cuotasPendientes(TipoMovimientos::DOCUMENTO_COMPRA),
        ];

        if ($esAdminSistema) {
            $contadores['organizaciones'] = Organizacion::count();
            $contadores['usuarios'] = User::count();
            $contadores['roles'] = Role::count();
        }

        return response()->json($contadores);
    }
}
