import { useEffect, useState,useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";

export default function ModalRol({ onClose, modo, rol = {}, refrescarRoles }) {
    const [nombre, setNombre] = useState(rol.name || '');
    const [errores, setErrores] = useState({});
    const nombreRef = useRef(null);
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');
    // Enfocar el campo de nombre al abrir el modal
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);

    // Actualizar el estado del formulario cuando cambie el usuario
    useEffect(() => {
        if (modo === 'editar') {
            setNombre(rol.name || '');
        }
    }, [rol, modo]); // Dependencia en 'rol' y 'modo'

    // Función para manejar la creación o edición del rol
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const rolData = {
                name: nombre,
            };

            if (modo === 'crear') {

                // Crear un nuevo rol
                await clienteAxios.post('api/crearrol', rolData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Rol creado exitosamente.');
            } else {
                // Editar rol existente
                await clienteAxios.put(`api/rolUpdate/${rol.id}`, rolData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Rol actualizado exitosamente.');
            }

            // Refrescar la lista de roles
            if (refrescarRoles !== null && typeof refrescarRoles === 'function'){
                refrescarRoles();
            } 
            
            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar el rol', error);
                toast.error('Error al guardar el rol'); // Mostrar mensaje de error genérico
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
                    {modo ===  'crear' ? 'Crear Rol' : 'Editar Rol'}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Campo para Nombre */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            ref={nombreRef}
                            className={`w-full px-3 py-2 border ${errores.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                        {errores.name && <p className="text-red-500 text-sm">{errores.name[0]}</p>}
                    </div>

                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="g360-danger text-white rounded px-4 py-2 hover:opacity-90 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="g360-gradient text-white rounded px-4 py-2 hover:opacity-90 transition"
                        >
                            {modo === 'crear' ? 'Crear Rol' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
