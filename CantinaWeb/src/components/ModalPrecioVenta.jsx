import { useEffect, useState, useRef } from "react";
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearMiles, formatearGuarani, limpiarFormato } from '../helpers/HelpersNumeros';

export default function ModalPrecioVenta({
    onClose,
    modo,
    precioVenta = {},
    refrescarPrecioVenta,
}) {
    const [nombre, setNombre] = useState(precioVenta.nombre || "");
    const [productoSeleccionado, setProductoSeleccionado] = useState(
        precioVenta.id_producto ? String(precioVenta.id_producto) : "",
    );

    const [codigo_barras, setCodigoBarras] = useState(
        precioVenta.codigo_barras || "",
    );
    const [tipoMonedaSeleccionada, setTipoMonedaSeleccionada] = useState(
        precioVenta.id_tipo_moneda ? String(precioVenta.id_tipo_moneda) : "",
    );
    const [tiposMoneda, setTiposMoneda] = useState([]);
    const [precio, setPrecio] = useState(precioVenta.precio || "");
    //organizacion seleccionada
    const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState(
        precioVenta.id_organizacion ? String(precioVenta.id_organizacion) : "",
    );
    const [organizaciones, setOrganizaciones] = useState([]);
    const [errores, setErrores] = useState({});
    const codigoBarrasRef = useRef(null);

    const token = localStorage.getItem("AUTH_TOKEN");

    // Actualizar el estado del formulario cuando cambie el precio venta o el modo
    useEffect(() => {
        if (modo === "editar") {
            setNombre(precioVenta.nombre || "");
        }
    }, [precioVenta, modo]); // Dependencia en 'precioVenta' y 'modo'

    // Enfocar el campo de nombre cuando el modal se abra
    useEffect(() => {
        if (codigoBarrasRef.current) {
            codigoBarrasRef.current.focus();
        }
    }, []);
    // Función para manejar la creación o edición de la precioVenta
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const precioVentaData = {
                nombre: nombre,
                id_producto: productoSeleccionado,
                codigo_barras: codigo_barras,
                id_tipo_moneda: tipoMonedaSeleccionada,
                precio: limpiarFormato(precio),
                id_organizacion: organizacionSeleccionada,
            };

            if (modo === "crear") {
                // Crear un nuevo precioVenta
                await clienteAxios.post("api/crear_precio_venta", precioVentaData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                toast.success("Precio venta creado exitosamente.");
            } else {
                // Editar precioVenta existente
                await clienteAxios.put(
                    `api/update_precio_venta/${precioVenta.id}`,
                    precioVentaData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                toast.success("Precio venta actualizado exitosamente.");
            }

            // Refrescar la lista de Precio ventas en la vista principal
            if (
                refrescarPrecioVenta !== null &&
                typeof refrescarPrecioVenta === "function"
            ) {
                refrescarPrecioVenta();
            }

            // Cerrar el modal después de guardar
            onClose();
        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);
            } else {
                console.error("Error al guardar el precio venta", error);
                toast.error("Error al guardar el precio venta"); // Mostrar mensaje de error genérico
            }
        }
    };

    // Cargar los organizacion desde la API al cargar el componente
    useEffect(() => {
        const fetchOrganizacion = async () => {
            try {
                const { data } = await clienteAxios.get("api/organizacion?all=true", {
                    headers: {
                        Authorization: `Bearer ${token}`, // Configurar el token en los headers
                    },
                });
                setOrganizaciones(data);
            } catch (error) {
                console.error("Error al cargar las organizaciones", error);
            }
        };

        fetchOrganizacion();
    }, []);

        // Cargar los tipos de monedas desde la API al cargar el componente
    useEffect(() => {
        const fetchMonedas = async () => {
            try {
                const { data } = await clienteAxios.get("api/tipo_moneda?all=true", {
                    headers: {
                        Authorization: `Bearer ${token}`, // Configurar el token en los headers
                    },
                });
                setTiposMoneda(data);
            } catch (error) {
                console.error("Error al cargar las monedas", error);
            }
        };

        fetchMonedas();
    }, []);

    // Buscar producto por código de barras y autocompletar nombre
    useEffect(() => {
        const buscarProductoPorCodigo = async () => {
            if (codigo_barras && codigo_barras.length > 0) {
                try {
                    const { data } = await clienteAxios.get(
                        `/api/productos/buscar?codigo_barras=${codigo_barras}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );
                    if (data && data.producto) {
                        setNombre(data.producto.nombre || "");
                        setProductoSeleccionado(String(data.producto.id));
                    } else {
                        setNombre("");
                        setProductoSeleccionado("");
                    }
                } catch (error) {
                    setNombre("");
                    setProductoSeleccionado("");
                }
            } else {
                setNombre("");
            }
        };
        buscarProductoPorCodigo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codigo_barras]);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Fondo oscuro semi-transparente */}
            <div
                className="bg-gray-800 opacity-75 absolute inset-0"
                onClick={onClose}
            ></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-10 p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">
                    {modo === "crear" ? "Crear Precio Venta" : "Editar Precio Venta"}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Campo para Codigo de barras */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Codigo de barras
                        </label>
                        <input
                            type="text"
                            ref={codigoBarrasRef}
                            className={`w-full px-3 py-2 border ${errores && errores.codigo_barras ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el codigo de barras"
                            value={codigo_barras}
                            onChange={(e) => setCodigoBarras(e.target.value)}
                            autoComplete="off"
                        />
                        {errores &&
                            errores.codigo_barras &&
                            Array.isArray(errores.codigo_barras) && (
                                <p className="text-red-500 text-sm">
                                    {errores.codigo_barras[0]}
                                </p>
                            )}
                    </div>

                    {/* Campo para nombre */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            disabled
                            className={`w-full px-3 py-2 border ${errores && errores.nombre ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el nombre"
                            value={nombre}
                            readOnly
                        />
                        {errores && errores.nombre && Array.isArray(errores.nombre) && (
                            <p className="text-red-500 text-sm">{errores.nombre[0]}</p>
                        )}
                    </div>
                    
                    {/* Campo para Organizacion */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Organizacion
                        </label>
                        <select
                            className={`w-full px-3 py-2 border ${errores.id_organizacion ? "border-red-500" : "border-gray-300"} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            value={organizacionSeleccionada}
                            onChange={(e) => setOrganizacionSeleccionada(e.target.value)}
                        >
                            <option value="">Seleccione una organizacion</option>
                            {organizaciones.map((organizacion) => (
                                <option key={organizacion.id} value={organizacion.id}>
                                    {organizacion.RazonSocial}
                                </option>
                            ))}
                        </select>
                        {errores.id_organizacion && (
                            <p className="text-red-500 text-sm">
                                {errores.id_organizacion[0]}
                            </p>
                        )}
                    </div>

                    {/* Campo para Tipos de monedas */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Moneda
                        </label>
                        <select
                            className={`w-full px-3 py-2 border ${errores.id_tipo_moneda ? "border-red-500" : "border-gray-300"} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            value={tipoMonedaSeleccionada}
                            onChange={(e) => setTipoMonedaSeleccionada(e.target.value)}
                        >
                            <option value="">Seleccione un tipo de moneda</option>
                            {tiposMoneda.map((tipoMoneda) => (
                                <option key={tipoMoneda.id} value={tipoMoneda.id}>
                                    {tipoMoneda.nombre}
                                </option>
                            ))}
                        </select>
                        {errores.id_tipo_moneda && (
                            <p className="text-red-500 text-sm">
                                {errores.id_tipo_moneda[0]}
                            </p>
                        )}
                    </div>
                    {/* Campo para precio de venta */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio de venta
                        </label>
                        <input
                            type="text"
                            min="0"
                            className={`w-full px-3 py-2 border ${errores && errores.precio ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el precio de venta"
                            value={formatearGuarani(Number(precio))}
                            onChange={(e) => {
                                const valorDigitado = e.target.value;
                                // Eliminamos puntos y caracteres no numéricos
                                const soloNumeros = valorDigitado.replace(/\D/g, "");
                                setPrecio(soloNumeros);
                            }}
                        />
                        {errores &&
                            errores.precio &&
                            Array.isArray(errores.precio) && (
                                <p className="text-red-500 text-sm">
                                    {errores.precio[0]}
                                </p>
                            )}
                    </div>

                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
                        >
                            {modo === "crear" ? "Crear Precio Venta" : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
