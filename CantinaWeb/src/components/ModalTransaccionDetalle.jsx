import { useEffect, useState,useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearMiles, formatearGuarani, limpiarFormato } from '../helpers/HelpersNumeros';
import { formatDateToInput } from '../helpers/HelpersFechas';


export default function ModalTransaccion({ onClose, modo, transaccionDetalle = {}, refrescarTransaccionesDetalle, id_transaccion }) {
    const [nombre, setNombre] = useState(transaccionDetalle.producto?.nombre || '');
    const [codigo_barras, setCodigoBarras] = useState(transaccionDetalle.producto?.codigo_barras || '');
    const [cantidad, setCantidad] = useState(() => {
        const numero = Number(transaccionDetalle.cantidad);
        return Number.isFinite(numero) && transaccionDetalle.cantidad !== '' ? String(numero) : (transaccionDetalle.cantidad || '');
    });
    const [unidad_medida, setUnidadMedida] = useState(transaccionDetalle.producto?.unidad_medida || '');
    const [precio_unitario, setPrecioUnitario] = useState(() => {
        const numero = Number(transaccionDetalle.precio_unitario);
        return Number.isFinite(numero) && transaccionDetalle.precio_unitario !== '' ? String(numero) : (transaccionDetalle.precio_unitario || '');
    });
    const [subTotal, setSubTotal] = useState(transaccionDetalle.producto?.subtotal || '');
    const [fecha, setFecha] = useState(transaccionDetalle.created_at ? formatDateToInput(transaccionDetalle.created_at) : formatDateToInput(new Date()));

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
            setUnidadMedida(transaccionDetalle.unidad_medida || '');
            setSubTotal(transaccionDetalle.subtotal || '');
            {
                const numero = Number(transaccionDetalle.precio_unitario);
                setPrecioUnitario(Number.isFinite(numero) && transaccionDetalle.precio_unitario !== '' ? String(numero) : (transaccionDetalle.precio_unitario || ''));
            }
            setFecha(transaccionDetalle.created_at ? formatDateToInput(transaccionDetalle.created_at) : formatDateToInput(new Date()));
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
                precio_unitario: precioUnitarioNumber,
                subtotal: subtotalNumber,
                Fecha: fecha,
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
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar el detalle', error);
                toast.error('Error al guardar el detalle'); // Mostrar mensaje de error genérico
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[1040]">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-[1041] p-6 w-full max-w-5xl border border-red-500">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {modo === 'crear' ? 'Crear Detalle' : 'Editar Detalle'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-h-[80vh] overflow-y-auto">
                        {/* Campos del formulario */}
                        <div className="col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Campo para Codigo de barras */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codigo de barras</label>
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
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
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
                            {/* Campo para cantidad */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                                <input
                                    type="text"
                                    min="0"
                                    className={`w-full px-3 py-2 border ${(errores && errores.cantidad) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la cantidad"
                                    value={formatearMiles(Number(cantidad))}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setCantidad(soloNumeros);
                                    }}
                                />
                                {errores && errores.cantidad && Array.isArray(errores.cantidad) && (
                                    <p className="text-red-500 text-sm">{errores.cantidad[0]}</p>
                                )}
                            </div>
                            {/* Campo para precio compra */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario</label>
                                <input
                                    type="text"
                                    min="0"
                                    className={`w-full px-3 py-2 border ${(errores && errores.precio_unitario) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                        </div>
                    </div>



                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
                        >
                            {isSaving ? 'Guardando...' : (modo === 'crear' ? 'Crear Transaccion' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
