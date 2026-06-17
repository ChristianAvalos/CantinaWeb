import { useEffect, useState, useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";

export default function ModalPrecioVenta({ onClose, modo, precioVenta = {}, refrescarPrecioVenta }) {
    const [nombre, setNombre] = useState(precioVenta.nombre || '');
    const [errores, setErrores] = useState({});
    const nombreRef = useRef(null);

    const token = localStorage.getItem('AUTH_TOKEN');

    // Actualizar el estado del formulario cuando cambie el precio venta o el modo
    useEffect(() => {
        if (modo === 'editar') {
            setNombre(precioVenta.nombre || '');
        }
    }, [precioVenta, modo]); // Dependencia en 'precioVenta' y 'modo'

    // Enfocar el campo de nombre cuando el modal se abra
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);
    // Función para manejar la creación o edición de la precioVenta
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const precioVentaData = {
                nombre: nombre,
            };

            if (modo === 'crear') {

                // Crear un nueo precioVenta
                await clienteAxios.post('api/crear_precio_venta', precioVentaData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Precio venta creado exitosamente.');
            } else {
                // Editar precioVenta existente
                await clienteAxios.put(`api/update_precio_venta/${categoria.id}`, precioVentaData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Precio venta actualizado exitosamente.');
            }

            // Refrescar la lista de Precio ventas en la vista principal
            if (refrescarPrecioVenta !== null && typeof refrescarPrecioVenta === 'function') {
                refrescarPrecioVenta();
            }

            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar el precio venta', error);
                toast.error('Error al guardar el precio venta'); // Mostrar mensaje de error genérico
            }
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-10 p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">
                    {modo === 'crear' ? 'Crear Precio Venta' : 'Editar Precio Venta'}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Campo para Nombre */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            ref={nombreRef}
                            className={`w-full px-3 py-2 border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                        {errores.nombre && <p className="text-red-500 text-sm">{errores.nombre[0]}</p>}
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
                            {modo === 'crear' ? 'Crear Precio Venta' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
