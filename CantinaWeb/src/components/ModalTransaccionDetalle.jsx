import { useEffect, useState,useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearMiles, formatearGuarani, limpiarFormato } from '../helpers/HelpersNumeros';
import { formatDateToInput } from '../helpers/HelpersFechas';


export default function ModalTransaccion({ onClose, modo, transaccionDetalle = {}, refrescarTransaccionesDetalle, id_transaccion, tipoTransaccion = '' }) {
    const [nombre, setNombre] = useState(transaccionDetalle.producto?.nombre || '');
    const [codigo_barras, setCodigoBarras] = useState(transaccionDetalle.producto?.codigo_barras || '');
    const [cantidad, setCantidad] = useState(() => {
        const numero = Number(transaccionDetalle.cantidad);
        return Number.isFinite(numero) && transaccionDetalle.cantidad !== '' ? String(numero) : (transaccionDetalle.cantidad || '');
    });
    const [lote, setLote] = useState(transaccionDetalle.lote || '');
    const [unidad_medida, setUnidadMedida] = useState(transaccionDetalle.producto?.unidad_medida || '');
    const [precio_unitario, setPrecioUnitario] = useState(() => {
        const numero = Number(transaccionDetalle.precio_unitario);
        return Number.isFinite(numero) && transaccionDetalle.precio_unitario !== '' ? String(numero) : (transaccionDetalle.precio_unitario || '');
    });
    const [subTotal, setSubTotal] = useState(transaccionDetalle.producto?.subtotal || '');
    const [fecha_vencimiento, setFechaVencimiento] = useState(transaccionDetalle?.fecha_vencimiento ? formatDateToInput(transaccionDetalle.fecha_vencimiento) : '');

    const [errores, setErrores] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const token = localStorage.getItem('AUTH_TOKEN');

    //Para que el cursor inicie en el campo codigo de barras
    const codigoBarrasRef = useRef(null);

    // Referencia para el campo de código de barras
    useEffect(() => {
        if (codigoBarrasRef.current) {
            codigoBarrasRef.current.focus();
        }
    }, []);

    // Actualizar el estado del formulario cuando cambie la transaccion
    useEffect(() => {
        if (modo === 'editar') {
            setNombre(transaccionDetalle.producto?.nombre || '');
            setCodigoBarras(transaccionDetalle.producto?.codigo_barras || '');
            {
                const numero = Number(transaccionDetalle.cantidad);
                setCantidad(Number.isFinite(numero) && transaccionDetalle.cantidad !== '' ? String(numero) : (transaccionDetalle.cantidad || ''));
            }
            setLote(transaccionDetalle.lote || '');
            setUnidadMedida(transaccionDetalle.unidad_medida || '');
            setSubTotal(transaccionDetalle.subtotal || '');
            {
                const numero = Number(transaccionDetalle.precio_unitario);
                setPrecioUnitario(Number.isFinite(numero) && transaccionDetalle.precio_unitario !== '' ? String(numero) : (transaccionDetalle.precio_unitario || ''));
            }
            setFechaVencimiento(transaccionDetalle?.fecha_vencimiento ? formatDateToInput(transaccionDetalle.fecha_vencimiento) : '');
        }
    }, [transaccionDetalle, modo]); // Dependencia en 'transacciondetalle' y 'modo'

    // Buscar producto por código de barras y autocompletar nombre
    useEffect(() => {
        const buscarProductoPorCodigo = async () => {
            if (codigo_barras && codigo_barras.length > 0) {
                try {
                    const { data } = await clienteAxios.get(`/api/productos/buscar?codigo_barras=${codigo_barras}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                        if (data && data.producto) {
                        setNombre(data.producto.nombre || '');
                        setUnidadMedida(data.producto.unidad_medida || '');
                        // Autocompletar el precio unitario según el tipo de transacción:
                        // - Venta: precio de venta (considera el precio personalizado de precio_ventas)
                        // - Compra/Ajuste: precio de compra
                        if (modo === 'crear') {
                            if (tipoTransaccion === 'venta') {
                                if (data.producto.precio_venta) {
                                    setPrecioUnitario(String(data.producto.precio_venta));
                                }
                            } else if (data.producto.precio_compra) {
                                setPrecioUnitario(String(data.producto.precio_compra));
                            }
                        }
                    } else {
                        setNombre('');
                        setUnidadMedida('');
                    }
                } catch (error) {
                    setNombre('');
                    setUnidadMedida('');
                }
            } else {
                setNombre('');
                setUnidadMedida('');
            }
        };
        buscarProductoPorCodigo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codigo_barras]);


    // Función para manejar la creación o edición de la transaccion
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        if (isSaving) {
            return;
        }

        setIsSaving(true);
        setErrores({}); // Resetear errores antes de la validación

        // Validación para compras: la cantidad no puede ser menor al mínimo permitido
        if (tipoTransaccion === 'compra' && modo === 'editar') {
            const cantidadMinima = Number(transaccionDetalle?.cantidad_minima) || 0;
            const nuevaCantidad = Number(cantidad);
            if (cantidadMinima > 0 && nuevaCantidad < cantidadMinima) {
                setErrores({ cantidad: [`No se puede reducir la cantidad por debajo de ${cantidadMinima} unidades (mínimo por ventas ya realizadas).`] });
                setIsSaving(false);
                return;
            }
        }

        try {
            // Calcular subtotal si no está calculado
            const cantidadNumber = Number(cantidad);
            const precioUnitarioNumber = Number(precio_unitario);
            const subtotalNumber = cantidadNumber * precioUnitarioNumber;

            const transaccionDetalleData = {
                nombre: nombre,
                codigo_barras: codigo_barras,
                unidad_medida: unidad_medida,
                cantidad: cantidadNumber,
                lote: lote,
                precio_unitario: precioUnitarioNumber,
                subtotal: subtotalNumber,
                fecha_vencimiento: fecha_vencimiento,
                id_transaccion: id_transaccion
            };
            if (modo === 'crear') {

                // Crear una nueva transaccion
                await clienteAxios.post('api/creartransaccion_detalle', transaccionDetalleData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Detalle creado exitosamente.');
            } else {
                // Editar transaccion existente
                await clienteAxios.put(`api/update_transaccion_detalle/${transaccionDetalle.id}`, transaccionDetalleData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Deatalle actualizado exitosamente.');
            }

            // Refrescar la lista de transacciones detalle en el componente padre
            if (refrescarTransaccionesDetalle !== null && typeof refrescarTransaccionesDetalle === 'function') {
                refrescarTransaccionesDetalle();
            }
            // Cerrar el modal después de guardar
            onClose();
        } catch (error) {
            const mensaje = error.response?.data?.message || 'Error al guardar el detalle';
            if (error.response && error.response.status === 422) {
                const erroresValidacion = error.response.data.errors;
                if (erroresValidacion && typeof erroresValidacion === 'object') {
                    setErrores(erroresValidacion);
                } else {
                    // Errores de negocio (ej. stock insuficiente) vienen con "message"
                    setErrores({ general: [mensaje] });
                    toast.error(mensaje);
                }
            } else {
                console.error('Error al guardar el detalle', error);
                toast.error(mensaje);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1040] flex items-center justify-center p-2">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="relative z-[1041] max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
                <h2 className="mb-4 border-b border-slate-200 pb-3 text-xl font-bold text-slate-800 sm:text-2xl">
                    {modo === 'crear' ? 'Crear Detalle' : 'Editar Detalle'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
                        {/* Campos del formulario */}
                        <div className="col-span-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

                            {/* Campo para Codigo de barras */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Código de barras</label>
                                <input
                                    type="text"
                                    ref={codigoBarrasRef}
                                    className={`w-full px-3 py-2 border ${(errores && errores.codigo_barras) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el codigo de barras"
                                    value={codigo_barras}
                                    onChange={(e) => setCodigoBarras(e.target.value)}
                                    autoComplete="off"
                                />
                                {errores && errores.codigo_barras && Array.isArray(errores.codigo_barras) && (
                                    <p className="text-red-500 text-sm">{errores.codigo_barras[0]}</p>
                                )}
                            </div>

                            {/* Campo para nombre */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    disabled
                                    className={`w-full px-3 py-2 border ${(errores && errores.nombre) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el nombre"
                                    value={nombre}
                                    readOnly
                                />
                                {errores && errores.nombre && Array.isArray(errores.nombre) && (
                                    <p className="text-red-500 text-sm">{errores.nombre[0]}</p>
                                )}
                            </div>

                             {/* Campo para lote (no aplica en ventas) */}
                            {tipoTransaccion !== 'venta' && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Lote</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${(errores && errores.lote) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el lote"
                                    value={lote}
                                    onChange={(e) => setLote(e.target.value)}
                                />
                                {errores && errores.lote && Array.isArray(errores.lote) && (
                                    <p className="text-red-500 text-sm">{errores.lote[0]}</p>
                                )}
                            </div>
                            )}
                            {/* Campo para precio unitario / precio de venta */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">{tipoTransaccion === 'venta' ? 'Precio de venta' : 'Precio unitario'}</label>
                                <input
                                    type="text"
                                    min="0"
                                    className={`w-full rounded-md border px-3 py-2 text-right tabular-nums shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${(errores && errores.precio_unitario) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Introduce el precio unitario"
                                    value={formatearGuarani(Number(precio_unitario))}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setPrecioUnitario(soloNumeros);
                                    }}

                                />
                                {errores && errores.precio_unitario && Array.isArray(errores.precio_unitario) && (
                                    <p className="text-red-500 text-sm">{errores.precio_unitario[0]}</p>
                                )}
                            </div>
                            {/* Campo para cantidad */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">{tipoTransaccion === 'venta' ? 'Cantidad a vender' : 'Cantidad'}</label>
                                <input
                                    type="text"
                                    min="0"
                                    className={`w-full rounded-md border px-3 py-2 text-right tabular-nums shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${(errores && errores.cantidad) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Introduce la cantidad"
                                    value={formatearMiles(Number(cantidad))}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setCantidad(soloNumeros);
                                    }}
                                />
                                {tipoTransaccion === 'compra' && modo === 'editar' && Number(transaccionDetalle?.cantidad_minima) > 0 && (
                                    <p className="text-amber-600 text-xs mt-1">
                                        ⚠️ Mínimo permitido: {formatearMiles(Number(transaccionDetalle.cantidad_minima))} unidades (por ventas realizadas)
                                    </p>
                                )}
                                {errores && errores.cantidad && Array.isArray(errores.cantidad) && (
                                    <p className="text-red-500 text-sm">{errores.cantidad[0]}</p>
                                )}
                            </div>
                            {/* Campo para vencimiento (no aplica en ventas) */}
                            {tipoTransaccion !== 'venta' && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Vencimiento</label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 border ${errores?.fecha_vencimiento ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la fecha de vencimiento"
                                    value={fecha_vencimiento}
                                    onChange={(e) => setFechaVencimiento(e.target.value)}
                                />

                                {errores?.fecha_vencimiento && <p className="text-red-500 text-sm">{errores?.fecha_vencimiento[0]}</p>}
                            </div>
                            )}
                        </div>
                    </div>



                    {/* Botones para cerrar y guardar */}
                    <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Guardando...' : (modo === 'crear' ? 'Crear detalle' : 'Guardar cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
