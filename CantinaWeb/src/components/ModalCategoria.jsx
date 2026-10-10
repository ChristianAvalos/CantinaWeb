import { useEffect, useState, useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";

export default function ModalCategoria({ onClose, modo, categoria = {}, refrescarCategorias }) {
    const [nombre, setNombre] = useState(categoria.nombre || '');
    const [errores, setErrores] = useState({});
    const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState('');
    const [organizaciones, setOrganizaciones] = useState([]);
    const nombreRef = useRef(null);
    const { user } = useAuth({ middleware: 'auth' });
    const esAdminSistema = Number(user?.rol_id) === 1;

    const token = localStorage.getItem('AUTH_TOKEN');

    // Solo el Administrador de Sistema elige organización al crear.
    useEffect(() => {
        if (!esAdminSistema) {
            return;
        }
        clienteAxios.get('api/organizacion?all=true', { headers: { Authorization: `Bearer ${token}` } })
            .then(({ data }) => setOrganizaciones(Array.isArray(data) ? data : []))
            .catch(() => setOrganizaciones([]));
    }, [esAdminSistema, token]);

    useEffect(() => {
        if (modo === 'crear' && esAdminSistema && user?.id_organizacion) {
            setOrganizacionSeleccionada(String(user.id_organizacion));
        }
    }, [modo, esAdminSistema, user]);

    // Actualizar el estado del formulario cuando cambie la categoria
    useEffect(() => {
        if (modo === 'editar') {
            setNombre(categoria.nombre || ''),
            setOrganizacionSeleccionada(categoria.id_organizacion ? String(categoria.id_organizacion) : '');
        }
    }, [categoria, modo]); // Dependencia en 'categoria' y 'modo'

    // Enfocar el campo de nombre cuando el modal se abra
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);
    // Función para manejar la creación o edición de la categoria
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const categoriaData = {
                nombre: nombre,
            };

            // El Administrador de Sistema puede crear en otra organización.
            if ((modo === 'crear' || modo === 'editar') && esAdminSistema && organizacionSeleccionada) {
                categoriaData.id_organizacion = organizacionSeleccionada;
            }

            if (modo === 'crear') {

                // Crear una nueva categoria
                await clienteAxios.post('api/crear_categoria', categoriaData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Categoria creado exitosamente.');
            } else {
                // Editar categoria existente
                await clienteAxios.put(`api/update_categoria/${categoria.id}`, categoriaData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Categoria actualizado exitosamente.');
            }

            // Refrescar la lista de categorias
            if (refrescarCategorias !== null && typeof refrescarCategorias === 'function') {
                refrescarCategorias();
            }

            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            const mensaje = error.response?.data?.message || 'Error al guardar la categoria';
            if (error.response && error.response.status === 422) {
                const erroresValidacion = error.response.data.errors;
                if (erroresValidacion && typeof erroresValidacion === 'object') {
                    setErrores(erroresValidacion);
                } else {
                    setErrores({ general: [mensaje] });
                    toast.error(mensaje);
                }
            } else {
                console.error('Error al guardar la categoria', error);
                toast.error(mensaje);
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
                    {modo === 'crear' ? 'Crear Categoria' : 'Editar Categoria'}
                </h2>

                <form onSubmit={handleSubmit}>
                    {esAdminSistema && (modo === 'crear' || modo === 'editar') && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organización</label>
                            <select
                                className={`w-full px-3 py-2 border ${errores.id_organizacion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                value={organizacionSeleccionada}
                                onChange={(e) => setOrganizacionSeleccionada(e.target.value)}
                            >
                                <option value="">Seleccione una organización</option>
                                {organizaciones.map((organizacion) => (
                                    <option key={organizacion.id} value={organizacion.id}>
                                        {organizacion.RazonSocial}
                                    </option>
                                ))}
                            </select>
                            {errores.id_organizacion && <p className="text-red-500 text-sm">{errores.id_organizacion[0]}</p>}
                        </div>
                    )}

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
                            type="button"
                            onClick={onClose}
                            className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
                        >
                            {modo === 'crear' ? 'Crear Categoria' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
