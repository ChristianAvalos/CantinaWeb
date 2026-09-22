import { useEffect, useState, useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearPorFormato, calcularDigitoVerificadorRuc, esFormatoRuc } from '../helpers/HelpersNumeros';

export default function ModalPersona({ onClose, modo, persona = {}, refrescarPersonas }) {
    const [form, setForm] = useState({
        nombre: persona.nombre || '',
        documento: persona.documento || '',
        direccion: persona.direccion || '',
        telefono: persona.telefono || '',
        email: persona.email || '',
        id_tipo_persona: persona.id_tipo_persona || '',
        // Catálogo de tipos de documento (C.I., RUC, ...) definido en la BD
        id_tipo_documento: persona.id_tipo_documento || '',
        // El estado no se edita aquí: se activa/desactiva desde el listado.
        // Al crear, por defecto queda Activo (1).
        id_tipoestado: persona.id_tipoestado || '1'
    });

    const [tipoPersona, setTipoPersona] = useState([]);
    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [errores, setErrores] = useState({});
    const nombreRef = useRef(null);

    // Si el tipo de persona es Proveedor, el documento siempre es un RUC
    const tipoPersonaSeleccionada = tipoPersona.find(
        (tipo) => String(tipo.id) === String(form.id_tipo_persona)
    );
    const nombreTipoPersona = tipoPersonaSeleccionada?.nombre || persona?.tipo_persona?.nombre || '';
    const esProveedor = (nombreTipoPersona || '').trim().toLowerCase() === 'proveedor';

    // El tipo de documento (y su formato) sale del catálogo de la BD.
    // El combo no tiene opción vacía: si aún no hay selección se usa el primero del catálogo.
    const idTipoDocumento = form.id_tipo_documento || tiposDocumento[0]?.id || '';
    const tipoDocumentoSeleccionado = tiposDocumento.find(
        (tipo) => String(tipo.id) === String(idTipoDocumento)
    );
    const formatoDocumento = tipoDocumentoSeleccionado?.formato || 'libre';
    const esRuc = esFormatoRuc(formatoDocumento);

    const idTipoDocumentoPorNombre = (nombre) => tiposDocumento.find(
        (tipo) => (tipo.nombre || '').trim().toLowerCase() === nombre.trim().toLowerCase()
    )?.id;

    // El RUC se compone de la base (lo que se escribe) + el dígito verificador calculado
    const baseRuc = (form.documento || '').toString().split('-')[0].replace(/\D/g, '');
    const digitoVerificadorRuc = calcularDigitoVerificadorRuc(baseRuc);

    // El input solo guarda la base del RUC (máx. 8 dígitos); si pegan un RUC completo se ignora el DV
    const handleRucChange = (e) => {
        const valor = e.target.value;
        const parteBase = valor.includes('-') ? valor.split('-')[0] : valor;
        setForm({ ...form, documento: parteBase.replace(/\D/g, '').slice(0, 8) });
    };

    const handleTipoPersonaChange = (e) => {
        const idTipoPersona = e.target.value;
        const nombreNuevo = tipoPersona.find((tipo) => String(tipo.id) === String(idTipoPersona))?.nombre;
        const seraProveedor = (nombreNuevo || '').trim().toLowerCase() === 'proveedor';

        // Los proveedores siempre usan RUC
        const idTipoDocumento = seraProveedor
            ? (idTipoDocumentoPorNombre('RUC') ?? form.id_tipo_documento)
            : form.id_tipo_documento;

        setForm({
            ...form,
            id_tipo_persona: idTipoPersona,
            id_tipo_documento: idTipoDocumento,
            // Si cambia el formato del documento el número deja de ser válido: se limpia
            documento: String(idTipoDocumento) === String(form.id_tipo_documento) ? form.documento : ''
        });
    };

    const handleTipoDocumentoChange = (e) => {
        // Los formatos no son compatibles entre sí: se limpia el número
        setForm({ ...form, id_tipo_documento: e.target.value, documento: '' });
    };

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
                id_tipo_documento: persona.id_tipo_documento || '',
                // Se conserva el estado actual (no se edita en el modal).
                id_tipoestado: persona.id_tipoestado || '1'
            });
        }
    }, [persona, modo]); // Dependencia en 'persona' y 'modo'

    // Al cargar el catálogo (o cambiar de persona) se asegura un tipo de documento válido
    useEffect(() => {
        if (tiposDocumento.length === 0) return;

        // Los proveedores siempre usan RUC
        const idRuc = idTipoDocumentoPorNombre('RUC');
        if (esProveedor) {
            if (idRuc && String(form.id_tipo_documento) !== String(idRuc)) {
                setForm((prev) => ({ ...prev, id_tipo_documento: idRuc }));
            }
            return;
        }

        if (form.id_tipo_documento) return;

        // Sin tipo de documento guardado se deduce del número:
        // un RUC siempre se guarda con el guion del dígito verificador.
        const idSugerido = (persona?.documento || '').toString().includes('-')
            ? idRuc
            : (idTipoDocumentoPorNombre('C.I.') ?? tiposDocumento[0]?.id);

        if (idSugerido) setForm((prev) => ({ ...prev, id_tipo_documento: idSugerido }));
    }, [tiposDocumento, esProveedor, persona]); // eslint-disable-line react-hooks/exhaustive-deps

    // Función para manejar la creación o edición de la persona
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                // El tipo de documento enviado es el que muestra el combo (catálogo de la BD)
                if (key === 'id_tipo_documento') {
                    formData.append(key, idTipoDocumento);
                    return;
                }
                // El formulario decide el formato del documento antes de enviarlo,
                // según el formato definido en el catálogo de tipos de documento.
                if (key === 'documento') {
                    formData.append(key, formatearPorFormato(value, formatoDocumento));
                    return;
                }
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
            const mensaje = error.response?.data?.message || 'Error al guardar la persona';
            if (error.response && error.response.status === 422) {
                const erroresValidacion = error.response.data.errors;
                if (erroresValidacion && typeof erroresValidacion === 'object') {
                    setErrores(erroresValidacion);
                } else {
                    setErrores({ general: [mensaje] });
                    toast.error(mensaje);
                }
            } else {
                console.error('Error al guardar la persona', error);
                toast.error(mensaje);
            }
        }
    };

    // Cargar datos iniciales desde la API
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [tpRes, tdRes] = await Promise.all([
                    clienteAxios.get('api/tipo_personas', { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get('api/tipo_documentos', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setTipoPersona(tpRes.data);
                setTiposDocumento(tdRes.data);
            } catch (error) {
                console.error("Error al cargar los datos iniciales", error);
            }
        };

        fetchInitialData();
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
                        {/* Tipo de persona */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Tipo de persona</label>
                            <select
                                className={`w-full px-3 py-2 border ${errores.id_tipo_persona ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                value={form.id_tipo_persona}
                                onChange={handleTipoPersonaChange}
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
                        {/* Campo para documento (el tipo y su formato salen del catálogo de la BD) */}
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {tipoDocumentoSeleccionado?.nombre || 'Documento'}
                            </label>
                            <div className="flex">
                                <select
                                    className="w-24 shrink-0 px-2 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500"
                                    value={idTipoDocumento}
                                    onChange={handleTipoDocumentoChange}
                                    disabled={esProveedor}
                                    title={esProveedor ? 'Los proveedores siempre usan RUC' : 'Tipo de documento'}
                                >
                                    {/* Solo los tipos de documento cargados desde la BD */}
                                    {tiposDocumento.length === 0 && (
                                        <option value="">Sin tipos de documento</option>
                                    )}
                                    {tiposDocumento.map((tipoDocumento) => (
                                        <option key={tipoDocumento.id} value={tipoDocumento.id}>
                                            {tipoDocumento.nombre}
                                        </option>
                                    ))}
                                </select>

                                {esRuc ? (
                                    <>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={8}
                                            className={`w-full px-3 py-2 border ${errores.documento ? 'border-red-500' : 'border-gray-300'} border-r-0 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            placeholder="Nro. de RUC"
                                            value={baseRuc}
                                            onChange={handleRucChange}
                                        />
                                        <span className="inline-flex items-center px-2 rounded-r-md border border-gray-300 bg-gray-100 text-gray-700 font-medium tabular-nums">
                                            - {digitoVerificadorRuc ?? '–'}
                                        </span>
                                    </>
                                ) : (
                                    <input
                                        type="text"
                                        inputMode={formatoDocumento === 'miles' ? 'numeric' : 'text'}
                                        className={`w-full px-3 py-2 border ${errores.documento ? 'border-red-500' : 'border-gray-300'} rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="Introduce el documento"
                                        value={formatearPorFormato(form.documento, formatoDocumento)}
                                        onChange={(e) => setForm({ ...form, documento: e.target.value })}
                                    />
                                )}
                            </div>
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
                        
                    </div>



                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3 mt-3">
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
                            {modo === 'crear' ? 'Crear Persona' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
