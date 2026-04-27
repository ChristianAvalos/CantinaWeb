import { useEffect, useState,useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";

export default function ModalUsuarios({ onClose, modo, usuario = {}, refrescarUsuarios, ocultarRolesYOrganizaciones }) {
    const [nombre, setNombre] = useState(usuario.name || '');
    const [nombreUsuario,setNombreUsuario] = useState(usuario.nameUser || '');
    const [correo, setCorreo] = useState(usuario.email || '');
    const [rolSeleccionado, setRolSeleccionado] = useState(usuario.rol_id || '');
    const [roles, setRoles] = useState([]);
    const [organizacionSeleccionada, setorganizacionSeleccionada] = useState(usuario.id_organizacion || '');
    const [organizaciones, setOrganizacion] = useState([]);
    const [errores, setErrores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');


    const nombreRef = useRef(null);
    // Enfocar el campo de nombre al abrir el modal
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);

    // Cargar los roles desde la API al cargar el componente
    useEffect(() => {
        const fetchRoles = async () => {
            try {

                const { data } = await clienteAxios.get('api/roles?all=true', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setRoles(data);
            } catch (error) {
                console.error("Error al cargar los roles", error);
            }
        };

        fetchRoles();
    }, []);

    // Cargar los organizacion desde la API al cargar el componente
    useEffect(() => {
        const fetchOrganizacion = async () => {
            try {

                const { data } = await clienteAxios.get('api/organizacion?all=true', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setOrganizacion(data);
            } catch (error) {
                console.error("Error al cargar las organizaciones", error);
            }
        };

        fetchOrganizacion();
    }, []);

    // Actualizar el estado del formulario cuando cambie el usuario
    useEffect(() => {
        if (modo === 'editar') {
            setNombre(usuario.name || '');
            setNombreUsuario(usuario.nameUser || '');
            setCorreo(usuario.email || '');
            setRolSeleccionado(usuario.rol_id || '');
            setorganizacionSeleccionada(usuario.id_organizacion || '');
        }
    }, [usuario, modo]); // Dependencia en 'usuario' y 'modo'

    // Función para manejar la creación o edición del usuario
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        if (isSubmitting) return; // Evita doble click / doble submit

        setErrores({}); // Resetear errores antes de la validación
        setIsSubmitting(true);

        try {
            const userData = {
                name: nombre,
                nameUser: nombreUsuario,
                email: correo,
                rol_id: rolSeleccionado,
                id_organizacion: organizacionSeleccionada
            };

            if (modo === 'crear') {

                // Crear un nuevo usuario
                await clienteAxios.post('api/crearusuarios', userData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Usuario creado exitosamente.');
            } else {
                // Editar usuario existente
                await clienteAxios.put(`api/usuarioUpdate/${usuario.id}`, userData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Usuario actualizado exitosamente.');
            }

            // Refrescar la lista de usuarios
            if (refrescarUsuarios !== null && typeof refrescarUsuarios === 'function') {
                refrescarUsuarios();// Refrescar la lista de usuarios
            }

            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar el usuario', error);
                toast.error('Error al guardar el usuario'); // Mostrar mensaje de error genérico
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-4 px-6 pt-6 md:px-8 md:pt-8">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                            {modo === 'perfil'
                                ? 'Mi perfil'
                                : modo === 'crear'
                                    ? 'Crear Usuario'
                                    : 'Editar Usuario'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Completa la información y guarda los cambios.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        aria-label="Cerrar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 md:px-8 md:pb-8" aria-busy={isSubmitting}>
                    <fieldset disabled={isSubmitting} className="contents">
                    <div className="mt-6">
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

                    {/* Campo para Nombre de usuario*/}
                    {/* Combo para seleccionar Rol */}
                    {!ocultarRolesYOrganizaciones && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
                        <input
                            type="text"
                            className={`w-full px-3 py-2 border ${errores.nameUser ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el nombre de usuario"
                            value={nombreUsuario}
                            onChange={(e) => setNombreUsuario(e.target.value)}
                        />
                        {errores.nameUser && <p className="text-red-500 text-sm">{errores.nameUser[0]}</p>}
                    </div>
                    )}

                    {/* Campo para Correo */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                        <input
                            type="email"
                            className={`w-full px-3 py-2 border ${errores.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Introduce el correo"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                        />
                        {errores.email && <p className="text-red-500 text-sm">{errores.email[0]}</p>}
                    </div>


                    {/* Combo para seleccionar Rol */}
                    {!ocultarRolesYOrganizaciones && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.rol_id ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={rolSeleccionado}
                                    onChange={(e) => setRolSeleccionado(e.target.value)}
                                >
                                    <option value="">Seleccione un rol</option>
                                    {roles.map((rol) => (
                                        <option key={rol.id} value={rol.id}>
                                            {rol.name}
                                        </option>
                                    ))}
                                </select>
                                {errores.rol_id && <p className="text-red-500 text-sm">{errores.rol_id[0]}</p>}
                            </div>

                        </>
                    )}

                    {/* Combo para seleccionar organizacion */}
                    {!ocultarRolesYOrganizaciones && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organizacion</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_organizacion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={organizacionSeleccionada}
                                    onChange={(e) => setorganizacionSeleccionada(e.target.value)}
                                >
                                    <option value="">Seleccione una organizacion</option>
                                    {organizaciones.map((organizacion) => (
                                        <option key={organizacion.id} value={organizacion.id}>
                                            {organizacion.RazonSocial}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_organizacion && <p className="text-red-500 text-sm">{errores.id_organizacion[0]}</p>}
                            </div>

                        </>
                    )}

                    {/* Botones para cerrar y guardar */}
                    </div>
                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`inline-flex items-center justify-center rounded-lg border border-red-200 g360-danger px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-red-200 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`inline-flex items-center justify-center rounded-lg g360-gradient px-4 py-2 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                        >
                            {isSubmitting ? 'Guardando...' : (modo === 'crear' ? 'Crear Usuario' : 'Guardar Cambios')}
                        </button>
                    </div>
                    </fieldset>
                </form>
            </div>
        </div>
    );
}
