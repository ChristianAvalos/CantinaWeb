import { useEffect, useState, useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearMiles } from '../helpers/HelpersNumeros';

export default function ModalPersona({ onClose, modo, persona = {}, refrescarPersonas }) {
    const [form, setForm] = useState({
        nombre: persona.nombre || '',
        documento: persona.documento || '',
        direccion: persona.direccion || '',
        telefono: persona.telefono || '',
        email: persona.email || '',
        id_tipo_persona: persona.id_tipo_persona || '',
        id_tipoestado: persona.id_tipoestado || ''
    });

    const [tipoEstado, setTipoEstado] = useState([]);
    const [tipoPersona, setTipoPersona] = useState([]);
    const [errores, setErrores] = useState({});
    const nombreRef = useRef(null);

    const token = localStorage.getItem('AUTH_TOKEN');

    // Enfocar el campo de nombre cuando el modal se abra
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);

    // Actualizar el estado del formulario cuando cambie la persona
    useEffect(() => {
        if (modo === 'editar') {
            setForm({
                nombre: persona.nombre || '',
                documento: persona.documento || '',
                direccion: persona.direccion || '',
                telefono: persona.telefono || '',
                email: persona.email || '',
                id_tipo_persona: persona.id_tipo_persona || '',
                id_tipoestado: persona.id_tipoestado || ''
            });
        }
    }, [persona, modo]); // Dependencia en 'persona' y 'modo'

    // Función para manejar la creación o edición de la persona
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });


            if (modo === 'crear') {

                // Crear una nueva persona

                await clienteAxios.post('api/crear_persona', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Persona creada exitosamente.');
            } else {
                // Editar persona existente
                await clienteAxios.post(`api/update_persona/${persona.id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-HTTP-Method-Override': 'PUT'
                    }
                });
                toast.success('Persona actualizada exitosamente.');
            }

            // Refrescar la lista de personas
            if (refrescarPersonas !== null && typeof refrescarPersonas === 'function') {
                refrescarPersonas();
            }

            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar la persona', error);
                toast.error('Error al guardar la persona'); // Mostrar mensaje de error genérico
            }
        }
    };

    // Cargar los tipos de estados desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoEstado = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_estado?filtro=basico', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoEstado(data);
            } catch (error) {
                console.error("Error al cargar los tipos de estados", error);
            }
        };

        fetchTipoEstado();
    }, []);

    // Cargar los tipos de personas desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoPersona = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_personas', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoPersona(data);
            } catch (error) {
                console.error("Error al cargar los tipos de personas", error);
            }
        };

        fetchTipoPersona();
    }, []);


    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-10 p-6 w-full max-w-2xl border border-red-500">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">
                    {modo === 'crear' ? 'Crear Persona' : 'Editar Persona'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[80vh] overflow-y-auto">
                        {/* Campos del formulario */}
                        {/* Campo para Nombre */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                ref={nombreRef}
                                className={`w-full px-3 py-2 border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Introduce el nombre"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            />
                            {errores.nombre && <p className="text-red-500 text-sm">{errores.nombre[0]}</p>}
                        </div>
                        {/* Campo para documento */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
                            <input
                                type="text"
                                className={`w-full px-3 py-2 border ${errores.documento ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Introduce el documento"
                                value={formatearMiles(form.documento)}
                                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                                
                            />
                            {errores.documento && <p className="text-red-500 text-sm">{errores.documento[0]}</p>}
                        </div>

                        {/* Campo para direccion */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                            <input
                                type="text"
                                className={`w-full px-3 py-2 border ${errores.direccion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Introduce la dirección"
                                value={form.direccion}
                                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                            />
                            {errores.direccion && <p className="text-red-500 text-sm">{errores.direccion[0]}</p>}
                        </div>

                        {/* Campo para telefono */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                            <input
                                type="text"
                                className={`w-full px-3 py-2 border ${errores.telefono ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Introduce el telefono"
                                value={form.telefono}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            />
                            {errores.telefono && <p className="text-red-500 text-sm">{errores.telefono[0]}</p>}
                        </div>

                        {/* Campo para email */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                            <input
                                type="text"
                                className={`w-full px-3 py-2 border ${errores.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Introduce el correo"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            {errores.email && <p className="text-red-500 text-sm">{errores.email[0]}</p>}
                        </div>
                        {/* Tipo de persona */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de persona</label>
                            <select
                                className={`w-full px-3 py-2 border ${errores.id_tipo_persona ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                value={form.id_tipo_persona}
                                onChange={(e) => setForm({ ...form, id_tipo_persona: e.target.value })}
                            >
                                <option value="">Seleccione el tipo de persona</option>
                                {tipoPersona.map((tipoPersona) => (
                                    <option key={tipoPersona.id} value={tipoPersona.id}>
                                        {tipoPersona.nombre}
                                    </option>
                                ))}
                            </select>
                            {errores.id_tipo_persona && <p className="text-red-500 text-sm">{errores.id_tipo_persona[0]}</p>}
                        </div>

                        {/* Tipo de estado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de estado</label>
                            <select
                                className={`w-full px-3 py-2 border ${errores.id_tipoestado ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                value={form.id_tipoestado}
                                onChange={(e) => setForm({ ...form, id_tipoestado: e.target.value })}
                            >
                                <option value="">Seleccione el tipo de estado</option>
                                {tipoEstado.map((tipoEstado) => (
                                    <option key={tipoEstado.id} value={tipoEstado.id}>
                                        {tipoEstado.descripcion}
                                    </option>
                                ))}
                            </select>
                            {errores.id_tipoestado && <p className="text-red-500 text-sm">{errores.id_tipoestado[0]}</p>}
                        </div>
                    </div>



                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3 mt-3">
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
                            {modo === 'crear' ? 'Crear Persona' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
