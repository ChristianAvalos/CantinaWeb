<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PaisController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\CiudadController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\PersonaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\TipoPagoController;
use App\Http\Controllers\FormaPagoController;
use App\Http\Controllers\CategoriasController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\TipoEstadoController;
use App\Http\Controllers\TipoPersonaController;
use App\Http\Controllers\OrganizacionController;
use App\Http\Controllers\TransaccionesController;
use App\Http\Controllers\TipoComprobanteController;
use App\Http\Controllers\TipoMovimientosController;
use App\Http\Controllers\TipoUnidadMedidaController;
use App\Http\Controllers\TransaccionesDetalleController;
use App\Http\Controllers\DashboardController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->group(function() {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Endpoint único para dashboard contadores
    Route::get('/dashboard/contadores', [DashboardController::class, 'contadores']);

    Route::post('/logout',[AuthController::class,'logout']);
    Route::get('/usuarios',[AuthController::class,'index']);
    Route::get('/usuarios/permisos', [AuthController::class, 'ObtenerPermisosUsuario']);
    Route::post('/crearusuarios',[AuthController::class,'createUser']);
    Route::delete('/usuario/{id}', [AuthController::class, 'DeleteUser']);
    Route::put('/usuarioUpdate/{id}', [AuthController::class, 'updateUser'])->name('usuario.update');
    Route::post('/cambiarpassword', [AuthController::class, 'cambiarpassword']);
    Route::post('/usuario/{id}/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/usuario_estado/{id}', [AuthController::class, 'estadoUser']);

    //Organizacion 
    Route::get('/organizacion',[OrganizacionController::class,'index']);
    Route::delete('/organizacion/{id}', [OrganizacionController::class, 'DeleteOrganizacion']);
    Route::post('/crear_organizacion',[OrganizacionController::class,'createOrganizacion']);
    Route::put('/update_organizacion/{id}',[OrganizacionController::class,'updateOrganizacion']);

    //Roles
    Route::get('/roles',[RoleController::class,'index']);
    Route::delete('/roles/{id}', [RoleController::class, 'DeleteRol']);
    Route::post('/crearrol',[RoleController::class,'createRol']);
    Route::put('/rolUpdate/{id}', [RoleController::class, 'updateRol'])->name('rol.update');
    
    //Permisos a los roles
    Route::get('roles/{roleId}/permisos', [PermissionController::class, 'ObtenerPermisosRole']);
    Route::post('roles/{roleId}/permisos', [PermissionController::class, 'ActualizarPermisos']);

    //Reporte de usuarios
    Route::POST('/reporte/usuarios/descarga', [ReportController::class, 'downloadUserReport']);
    Route::GET('/reporte/usuarios', [ReportController::class, 'generateUserReport']);

    //Paises 
    Route::get('/paises',[PaisController::class,'index']);

    //Ciudades
    Route::get('/ciudades',[CiudadController::class,'index']);

    //Transacciones
    Route::get('/transacciones',[TransaccionesController::class,'index']);
    Route::delete('/transacciones/{id}', [TransaccionesController::class, 'DeleteTransaccion']);
    Route::post('/creartransaccion',[TransaccionesController::class,'createTransaccion']);
    Route::put('/update_transaccion/{id}',[TransaccionesController::class,'updateTransaccion']);
    Route::get('/transacciones/grafico', [TransaccionesController::class, 'grafico']);

    //transacciones detalle
    Route::get('/transacciones_detalle',[TransaccionesDetalleController::class,'index']);
    Route::delete('/transacciones_detalle/{id}', [TransaccionesDetalleController::class, 'deleteTransaccionDetalle']);
    Route::post('/creartransaccion_detalle',[TransaccionesDetalleController::class,'createTransaccionDetalle']);
    Route::put('/update_transaccion_detalle/{id}',[TransaccionesDetalleController::class,'updateTransaccionDetalle']);


    //Productos
    Route::get('/productos',[ProductoController::class,'index']);
    Route::get('/productos/buscar', [ProductoController::class, 'buscarPorCodigoBarras']);
    Route::post('/crearproducto',[ProductoController::class,'createProducto']);
    Route::delete('/productos/{id}', [ProductoController::class, 'deleteProducto']);
    Route::put('/update_producto/{id}',[ProductoController::class,'updateProducto']);

    //Categorias
    Route::get('/categorias',[CategoriasController::class,'index']);
    Route::delete('/categorias/{id}', [CategoriasController::class, 'DeleteCategoria']);
    Route::post('/crear_categoria',[CategoriasController::class,'createCategoria']);
    Route::put('/update_categoria/{id}',[CategoriasController::class,'updateCategoria']);

    //Personas
    Route::get('/personas',[PersonaController::class,'index']);
    Route::delete('/personas/{id}', [PersonaController::class, 'DeletePersona']);
    Route::post('/crear_persona',[PersonaController::class,'createPersona']);
    Route::put('/update_persona/{id}',[PersonaController::class,'updatePersona']);
    Route::post('/persona_estado/{id}', [PersonaController::class, 'estadoPersona']);

    //Tipo de personas
    Route::get('/tipo_personas',[TipoPersonaController::class,'index']);
    
    //Tipo de movimientos
    Route::get('/tipo_movimientos',[TipoMovimientosController::class,'index']);
    Route::delete('/tipo_movimientos/{id}', [TipoMovimientosController::class, 'DeleteTipoMovimiento']);
    Route::post('/crear_tipo_movimiento',[TipoMovimientosController::class,'createTipoMovimiento']);
    Route::put('/update_tipo_movimiento/{id}',[TipoMovimientosController::class,'updateTipoMovimiento']); 

    //Tipo de unidad de medida
    Route::get('/tipo_unidad_medida',[TipoUnidadMedidaController::class,'index']);

    //tipo de estado
    Route::get('/tipo_estado',[TipoEstadoController::class,'index']);

    //tipo de pago 
    Route::get('/tipo_pago',[TipoPagoController::class,'index']);

    //forma de pago 
    Route::get('/forma_pago',[FormaPagoController::class,'index']);

    //tipo de comprobante
    Route::get('/tipo_comprobante',[TipoComprobanteController::class,'index']);

});


//Logueo e inicio de sesion 
Route::post('/registro',[AuthController::class,'register']);
Route::post('/login',[AuthController::class,'login']);













