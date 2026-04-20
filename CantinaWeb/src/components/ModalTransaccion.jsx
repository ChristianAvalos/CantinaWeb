import { useEffect, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";
import { formatearMiles, formatearGuarani, limpiarFormato } from '../helpers/HelpersNumeros';
import { formatDateToInput } from '../helpers/HelpersFechas';
import ModalTransaccionDetalle from './ModalTransaccionDetalle';
import { obtenerTransaccionesDetalle } from '../helpers/HelpersTransacciones';

export default function ModalTransaccion({ onClose, modo, setModo, transaccion = {}, refrescarTransacciones, refrescarGastos, tipoTransaccion = '' }) {

    //area de las transacciones
    const [form, setForm] = useState({
        nombre: transaccion.nombre || '',
        descripcion: transaccion.descripcion || '',
        monto: transaccion.monto ?? 0,
        lote: transaccion.lote || '',
        nro_comprobante: transaccion.nro_comprobante || '',
        id_TipoPago: transaccion.id_TipoPago || '',
        id_FormaPago: transaccion.id_FormaPago || '',
        id_TipoEstado: transaccion.id_TipoEstado || '',
        id_TipoComprobante: transaccion.id_TipoComprobante || '',
        id_TipoMovimiento: tipoTransaccion === 'compra' ? 1 : tipoTransaccion === 'venta' ? 2 : 3,
        id_persona: transaccion.id_persona || '',
        UrevCalc: transaccion.UrevCalc || '',
        fecha: transaccion.fecha ? formatDateToInput(transaccion.fecha) : formatDateToInput(new Date())
    });

    //area de los cbos para las transacciones
    const [tipoPago, setTipoPago] = useState([]);
    const [tipoEstado, setTipoEstado] = useState([]);
    const [formaPago, setFormaPago] = useState([]);
    const [tipoComprobante, setTipoComprobante] = useState([]);
    //para personas
    const [personas, setPersonas] = useState([]);
    const [personaSeleccionada, setPersonaSeleccionada] = useState({
        id: transaccion.id_persona || '',
        nombre: transaccion.persona?.nombre || ''
    });
    const [busquedaPersona, setBusquedaPersona] = useState(transaccion.persona?.nombre || '');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    //area del detalle
    const [transaccionDetalle, settransaccionDetalle] = useState([]);
    const [transaccionDetalleSeleccionado, setTransaccionDetalleSeleccionado] = useState(null);


    //errores
    const [errores, setErrores] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    // Estado para el modo de la cabecera (puedes seguir usando 'modo' prop)
    // Estado para el modo del detalle
    const [modalModeDetalle, setModalModeDetalle] = useState('crear');


    //paginacion del detalle
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total del detalle
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    //buscador para el detalle
    const [searchTerm, setSearchTerm] = useState('');

    //apertura del modal del detalle
    const [isModalOpen, setModalOpen] = useState(false);


    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [transaccionAEliminar, setTransaccionAEliminar] = useState(null);

    // Función única para crear/actualizar transacción
    const guardarTransaccion = async (modo) => {
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });
            let idTransaccion = transaccion.id;
            let response;
            // for (let pair of formData.entries()) {
            //     console.log(pair[0] + ': ' + pair[1]);
            // }
            if (modo === 'crear' && !transaccion.id) {
                response = await clienteAxios.post('api/creartransaccion', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.id) {
                    idTransaccion = response.data.id;
                    transaccion.id = idTransaccion;
                }
            } else if (idTransaccion) {
                await clienteAxios.post(`api/update_transaccion/${idTransaccion}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-HTTP-Method-Override': 'PUT'
                    }
                });
            }
            return { success: true, id: idTransaccion };
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrores(error.response.data.errors);

            } else {
                setErrores({ general: ['Error al guardar la transaccion'] });

            }
            return { success: false, message: error.response?.data?.errors || 'Error al guardar la transaccion en la base de datos.' };

        }
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    const token = localStorage.getItem('AUTH_TOKEN');


    // Efecto para cargar personas basado en la búsqueda
    useEffect(() => {
        const fetchPersonas = async () => {
            const term = (busquedaPersona || '').trim();
            const digitsOnly = term.replace(/\D/g, '');
            const esBusquedaPorDocumento = digitsOnly.length >= 2;

            if (!term || (!esBusquedaPorDocumento && term.length < 2)) {
                setPersonas([]);
                return;
            }

            try {
                const { data } = await clienteAxios.get(`api/personas?search=${encodeURIComponent(term)}&all=1`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const lista = data?.data || data || [];
                const normalizar = (value) => (value ?? '')
                    .toString()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();

                const termNorm = normalizar(term);
                const filtrada = Array.isArray(lista)
                    ? lista.filter((p) => {
                        const nombre = normalizar(p?.nombre);
                        const documento = normalizar(p?.documento);
                        return nombre.includes(termNorm) || documento.includes(termNorm);
                    })
                    : [];

                setPersonas(filtrada);
            } catch (error) {
                console.error("Error al buscar personas", error);
                setPersonas([]);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchPersonas();
        }, 300); // Debounce de 300ms

        return () => clearTimeout(delayDebounceFn);
    }, [busquedaPersona]);

    // Efecto para actualizar persona cuando se edita
    useEffect(() => {
        if (modo === 'editar' && transaccion.persona) {
            setPersonaSeleccionada({
                id: transaccion.id_persona ?? transaccion.id_Persona,
                nombre: transaccion.persona.nombre
            });
            setBusquedaPersona(transaccion.persona.nombre);
        }
    }, [transaccion, modo]);

    // Función para seleccionar una persona
    const seleccionarPersona = (persona) => {
        setPersonaSeleccionada({
            id: persona.id,
            nombre: persona.nombre
        });
        setBusquedaPersona(persona.nombre);
        setMostrarSugerencias(false);

        // Actualizar el form con el id de la persona (minúsculas)
        setForm(prev => ({
            ...prev,
            id_persona: persona.id
        }));
    };

    // Función para limpiar selección
    const limpiarPersona = () => {
        setPersonaSeleccionada({ id: '', nombre: '' });
        setBusquedaPersona('');
        setPersonas([]);
        setMostrarSugerencias(false);

        setForm(prev => ({
            ...prev,
            id_persona: ''
        }));
    };

    //funcion para obtener las transacciones detalle
    //Tipo de movimientos 1=compra 2=venta 3=ajustes
    const fetchTansaccionDetalle = async (page = 1, search = '', id_transaccion = transaccion.id) => {
        try {
            const transaccionDetalle = await obtenerTransaccionesDetalle(page, search, id_transaccion);
            const detalles = transaccionDetalle.transaccionesDetalle.data || [];
            settransaccionDetalle(detalles);
            setTotalPaginas(transaccionDetalle.transaccionesDetalle.last_page);
            setTotalRegistros(transaccionDetalle.transaccionesDetalle.total);
            setPaginaActual(transaccionDetalle.transaccionesDetalle.current_page);
            const subtotalLocal = detalles.reduce((acc, item) => acc + Number(item?.subtotal || 0), 0);
            const subtotalCalculado = Number(transaccionDetalle.subtotal ?? transaccionDetalle.transaccionesDetalle?.subtotal ?? subtotalLocal);
            setSubTotal(subtotalCalculado);
            setForm(prev => ({
                ...prev,
                monto: subtotalCalculado
            }));
        } catch (error) {
            console.error('Error al cargar los detalles:', error);
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchTansaccionDetalle(paginaActual, searchTerm, transaccion.id);
    }, [paginaActual, searchTerm, transaccion.id]);

    useEffect(() => {
        const totalDetalles = (transaccionDetalle || []).reduce((acc, item) => acc + Number(item?.subtotal || 0), 0);
        setSubTotal(totalDetalles);
        setForm(prev => ({
            ...prev,
            monto: totalDetalles
        }));
    }, [transaccionDetalle]);

    // Actualizar el estado del formulario cuando cambie la transaccion
    useEffect(() => {
        if (modo === 'editar') {
            setForm({
                nombre: transaccion.nombre || '',
                descripcion: transaccion.descripcion || '',
                monto: transaccion.monto ?? 0,
                id_TipoEstado: transaccion.id_TipoEstado || '',
                id_TipoPago: transaccion.id_TipoPago || '',
                id_FormaPago: transaccion.id_FormaPago || '',
                id_TipoComprobante: transaccion.id_TipoComprobante || '',
                id_persona: transaccion.id_persona || '',
                nro_comprobante: transaccion.nro_comprobante || '',
                lote: transaccion.lote || '',
                UrevCalc: transaccion.UrevCalc || '',
                id_TipoMovimiento: tipoTransaccion === 'compra' ? 1 : tipoTransaccion === 'venta' ? 2 : 3,
                fecha: transaccion.fecha ? formatDateToInput(transaccion.fecha) : formatDateToInput(new Date())
            });


        }
    }, [transaccion, modo]); // Dependencia en 'transaccion' y 'modo'



    // Cargar los tipos de pagos desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoPagos = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_pago', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoPago(data);
            } catch (error) {
                console.error("Error al cargar los tipos de pago", error);
            }
        };

        fetchTipoPagos();
    }, []);

    // Cargar las fromas de pagos desde la API al cargar el componente
    useEffect(() => {
        const fetchFormasPagos = async () => {
            try {

                const { data } = await clienteAxios.get('api/forma_pago', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setFormaPago(data);
            } catch (error) {
                console.error("Error al cargar los tipos de pago", error);
            }
        };

        fetchFormasPagos();
    }, []);

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

    // Cargar los tipos de comprobantes desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoComprobante = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_comprobante', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoComprobante(data);
            } catch (error) {
                console.error("Error al cargar los tipos de comprobantes", error);
            }
        };

        fetchTipoComprobante();
    }, []);


    // Función para manejar la creación o edición de la transaccion
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) {
            return;
        }

        setIsSaving(true);
        setErrores({});
        try {
            const result = await guardarTransaccion(modo);
            if (result.success) {
                toast.success(result.message || 'Transacción guardada exitosamente.');
                if (refrescarTransacciones !== null && typeof refrescarTransacciones === 'function') {
                    refrescarTransacciones();
                }
                onClose();
            } else if (result.message) {
                toast.error(result.message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    //para la eliminacion de transacciones seleccionados 
    const handleDelete = async (id) => {

        setTransaccionAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta transaccion?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/transacciones_detalle/${transaccionAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            if (response.status === 200) {
                toast.success('Transaccion eliminada correctamente.');
                setMostrarAlertaModal(false); // Oculta la alerta
                fetchTansaccionDetalle();
            }
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar la transaccion.');
            setMostrarAlertaModal(true);
        } finally {
            setTransaccionAEliminar(null);
        }
    }

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal === 'delete') {
            confirmarEliminacion();
        }
    };
    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };


    return (
        <div className="fixed inset-0 flex items-center justify-center z-[1035]">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0 z-[1031]" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg relative z-[1036] p-3 sm:p-6 w-[95vw] max-w-full sm:max-w-5xl border border-red-500 overflow-y-auto max-h-screen">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">
                    {modo === 'crear' ? `Crear ${tipoTransaccion}` : `Editar ${tipoTransaccion}`}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                        {/* Campos del formulario */}
                        <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                            {/* Campo para Nombre */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    name='nombre'
                                    className={`w-full px-3 py-2 border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el nombre"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                />
                                {errores.nombre && <p className="text-red-500 text-sm">{errores.nombre[0]}</p>}
                            </div>

                            {/* Campo para fecha */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 border ${errores.fecha ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la fecha"
                                    value={form.fecha}
                                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                />

                                {errores.fecha && <p className="text-red-500 text-sm">{errores.fecha[0]}</p>}
                            </div>

                            {/* Campo para lote */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.lote ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el lote"
                                    value={form.lote}
                                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                                />
                                {errores.lote && <p className="text-red-500 text-sm">{errores.lote[0]}</p>}
                            </div>

                            {/* Tipo de comprobante */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de comprobante</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_TipoComprobante ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_TipoComprobante}
                                    onChange={(e) => setForm({ ...form, id_TipoComprobante: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo de comprobante</option>
                                    {tipoComprobante.map((tipoComprobante) => (
                                        <option key={tipoComprobante.id} value={tipoComprobante.id}>
                                            {tipoComprobante.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_TipoComprobante && <p className="text-red-500 text-sm">{errores.id_TipoComprobante[0]}</p>}
                            </div>

                            {/* Campo para comprobante numero */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nro Comprobante</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.nro_comprobante ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el comprobante"
                                    value={form.nro_comprobante}
                                    onChange={(e) => setForm({ ...form, nro_comprobante: e.target.value })}
                                />
                                {errores.nro_comprobante && <p className="text-red-500 text-sm">{errores.nro_comprobante[0]}</p>}
                            </div>

                            {/* Forma de pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Forma de pago</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_FormaPago ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_FormaPago}
                                    onChange={(e) => setForm({ ...form, id_FormaPago: e.target.value })}
                                >
                                    <option value="">Seleccione la forma de pago</option>
                                    {formaPago.map((formaPago) => (
                                        <option key={formaPago.id} value={formaPago.id}>
                                            {formaPago.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_FormaPago && <p className="text-red-500 text-sm">{errores.id_FormaPago[0]}</p>}
                            </div>

                            {/* Tipo de pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de pago</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_TipoPago ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_TipoPago}
                                    onChange={(e) => setForm({ ...form, id_TipoPago: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo de pago</option>
                                    {tipoPago.map((tipoPago) => (
                                        <option key={tipoPago.id} value={tipoPago.id}>
                                            {tipoPago.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_TipoPago && <p className="text-red-500 text-sm">{errores.id_TipoPago[0]}</p>}
                            </div>

                            {/* Tipo de estado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de estado</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_TipoEstado ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_TipoEstado}
                                    onChange={(e) => setForm({ ...form, id_TipoEstado: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo de estado</option>
                                    {tipoEstado.map((tipoEstado) => (
                                        <option key={tipoEstado.id} value={tipoEstado.id}>
                                            {tipoEstado.descripcion}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_TipoEstado && <p className="text-red-500 text-sm">{errores.id_TipoEstado[0]}</p>}
                            </div>


                            {/* Campo para Persona (Proveedor/Cliente) */}
                            <div className="mb-2 col-span-2 relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {tipoTransaccion === 'compra' ? 'Proveedor' : 'Cliente'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className={`w-full px-3 py-2 border ${errores.id_persona ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder={`Buscar ${tipoTransaccion === 'compra' ? 'proveedor' : 'cliente'}...`}
                                        value={busquedaPersona}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBusquedaPersona(value);
                                            setMostrarSugerencias(true);
                                            if (value === '') {
                                                setForm(prev => ({
                                                    ...prev,
                                                    id_persona: ''
                                                }));
                                                setPersonaSeleccionada({ id: '', nombre: '' });
                                            }
                                        }}
                                        onFocus={() => setMostrarSugerencias(true)}
                                    />

                                    {/* Botón para limpiar */}
                                    {personaSeleccionada.id && (
                                        <button
                                            type="button"
                                            onClick={limpiarPersona}
                                            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {/* Lista de sugerencias */}
                                {mostrarSugerencias && personas.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                                        {personas.map((persona) => (
                                            <li
                                                key={persona.id}
                                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                onClick={() => seleccionarPersona(persona)}
                                            >
                                                <div className="font-medium">{persona.nombre}</div>
                                                {persona.documento && (
                                                    <div className="text-sm text-gray-600">Doc: {persona.documento}</div>
                                                )}
                                                {persona.email && (
                                                    <div className="text-sm text-gray-600">Email: {persona.email}</div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {errores.id_persona && (
                                    <p className="text-red-500 text-sm">{errores.id_persona[0]}</p>
                                )}
                            </div>



                            {/* Campo para monto */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.monto ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Monto en Gs."
                                    disabled
                                    value={formatearGuarani(form.monto) || ''}
                                    //onChange={(e) => setMonto(e.target.value)}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setForm({ ...form, monto: soloNumeros });
                                    }}
                                />
                                {errores.monto && <p className="text-red-500 text-sm">{errores.monto[0]}</p>}
                            </div>

                            {/* Campo para Descripcion */}
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.descripcion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la descripción"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                />
                                {errores.descripcion && <p className="text-red-500 text-sm">{errores.descripcion[0]}</p>}
                            </div>
                        </div>
                    </div>


                    {/* Grilla de detalles */}
                    <div className="mt-1">
                        <div className="flex  items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{`Detalles de ${tipoTransaccion}`}</h3>
                            <button
                                type="button"
                                onClick={async () => {
                                    setErrores({});
                                    // Si la transacción ya tiene id, solo actualizar (modo 'editar')
                                    const modoGuardar = transaccion.id ? 'editar' : 'crear';
                                    const result = await guardarTransaccion(modoGuardar);
                                    if (result.success) {
                                        setErrores({});
                                        toast.success(result.message || 'Transacción guardada exitosamente.');
                                        // La cabecera ya quedó guardada, por lo tanto el formulario debe pasar a edición.
                                        if (typeof setModo === 'function') {
                                            setModo('editar');
                                        }
                                        // Si fue creación, cambia a modo editar y actualiza el id
                                        if (transaccion.id && result.id) {
                                            setModalModeDetalle('crear');
                                            transaccion.id = result.id;
                                            // Cambiar el estado del modal padre a editar
                                            if (typeof setModo === 'function') {
                                                setModo('editar');
                                            }
                                        } else {
                                            setModalModeDetalle('editar');
                                        }
                                        setTransaccionDetalleSeleccionado({});
                                        setModalOpen(true);
                                    } else if (result.message) {
                                        toast.error(result.message);
                                    }
                                }}
                                className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-800 transition"
                            >
                                Agregar
                            </button>
                        </div>

                        <div className="overflow-x-auto mt-2">
                            <table className="min-w-full border border-gray-300 rounded-lg">
                                <thead className="bg-gray-300">
                                    <tr>
                                        <th className="px-2 py-2 border">Codigo de barra</th>
                                        <th className="px-3 py-2 border">Producto</th>
                                        <th className="px-3 py-2 border">Cantidad</th>
                                        <th className="px-3 py-2 border">Precio unitario</th>
                                        <th className="px-3 py-2 border">Sub total</th>
                                        <th className="px-3 py-2 border">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Aquí deberías mapear los detalles cargados */}
                                    {transaccionDetalle && transaccionDetalle.length > 0 ? (
                                        transaccionDetalle.map((detalle, id) => (
                                            <tr key={id}>
                                                <td className="px-3 py-2 border">{detalle.producto.codigo_barras}</td>
                                                <td className="px-3 py-2 border">{detalle.producto.nombre}</td>
                                                <td className="px-3 py-2 border">{formatearMiles(Number(detalle.cantidad))}</td>
                                                <td className="px-3 py-2 border">{formatearGuarani(detalle.precio_unitario)}</td>
                                                <td className="px-3 py-2 border">{formatearGuarani(detalle.subtotal)}</td>
                                                <td className="px-3 py-2 border">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type='button'
                                                            onClick={async () => {
                                                                // Siempre actualizar la cabecera si ya existe
                                                                const modoGuardar = detalle.id ? 'editar' : 'crear';
                                                                console.log(detalle.id, modoGuardar);
                                                                
                                                                const result = await guardarTransaccion(modoGuardar);
                                                                if (result.success) {
                                                                    toast.success(result.message || 'Transacción guardada exitosamente.');
                                                                    if (typeof setModalModeDetalle === 'function') {
                                                                        setModalModeDetalle('editar');
                                                                    }
                                                                    setTransaccionDetalleSeleccionado(detalle);
                                                                    setModalOpen(true);
                                                                } else if (result.message) {
                                                                    toast.error(result.message);
                                                                }
                                                            }} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit" />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            onClick={() => handleDelete(detalle.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/trash_bin-remove.png" alt="Delete transaccion detalle" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-2 text-center text-gray-500 border">
                                                No hay detalles cargados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                        </div>
                        {/* Controles de paginación */}
                        <div className="flex flex-col items-center sm:flex-row sm:justify-between py-2 space-y-2 sm:space-y-0">
                            {/* Botones para la primera y anterior página */}
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(1)}
                                    disabled={paginaActual === 1}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    Primera
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(paginaActual - 1)}
                                    disabled={paginaActual === 1}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    Anterior
                                </button>
                            </div>

                            {/* Información de la página actual */}
                            <span className="text-sm sm:text-lg font-medium text-center">
                                Página {paginaActual} de {totalPaginas}
                            </span>

                            {/* Botones para la siguiente y última página */}
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(paginaActual + 1)}
                                    disabled={paginaActual === totalPaginas}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    Siguiente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(totalPaginas)}
                                    disabled={paginaActual === totalPaginas}
                                    className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    Última
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3 mt-2">
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
                            {isSaving ? 'Guardando...' : (transaccion.id ? 'Guardar Cambios' : 'Crear Transaccion')}
                        </button>

                    </div>
                </form>
            </div>
            {/* Renderizar el modal */}
            {isModalOpen && (
                <ModalTransaccionDetalle
                    transaccionDetalle={transaccionDetalleSeleccionado}
                    modo={modalModeDetalle}
                    refrescarTransaccionesDetalle={fetchTansaccionDetalle}
                    onClose={closeModal}
                    id_transaccion={transaccion.id}
                />
            )}

            {/* Mostrar alerta solo si es necesario */}
            {mostrarAlertaModal && (
                <AlertaModal
                    tipo={tipoAlertaModal}
                    mensaje={mensajeAlertaModal}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
}
