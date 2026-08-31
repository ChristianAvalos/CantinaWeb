import { useEffect, useRef, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";
import { formatearMiles, formatearGuarani, limpiarFormato } from '../helpers/HelpersNumeros';
import { formatDateToInput } from '../helpers/HelpersFechas';
import ModalTransaccionDetalle from './ModalTransaccionDetalle';
import { obtenerTransaccionesDetalle } from '../helpers/HelpersTransacciones';

// Suma días a una fecha 'YYYY-MM-DD' (o a hoy si es null) y devuelve 'YYYY-MM-DD' local
function sumarDiasLocal(fecha, dias) {
    const base = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    base.setDate(base.getDate() + dias);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Formatea un número de factura en formato 001-002-0000001 (3-3-7 dígitos).
// Se usa tanto para la vista como para guardar el valor con guiones (campo varchar).
function formatearNroFactura(valor) {
    const digitos = String(valor || '').replace(/\D/g, '');
    if (!digitos) return '';
    const partes = [];
    partes.push(digitos.slice(0, 3));
    if (digitos.length > 3) partes.push(digitos.slice(3, 6));
    if (digitos.length > 6) partes.push(digitos.slice(6, 13));
    return partes.join('-');
}

export default function ModalTransaccion({ onClose, modo, setModo, transaccion = {}, refrescarTransacciones, refrescarGastos, tipoTransaccion = '' }) {
    const tipoPersonaFiltro = tipoTransaccion === 'compra'
        ? 'Proveedor'
        : tipoTransaccion === 'venta'
            ? 'Cliente'
            : null;

    // Modo solo lectura: deshabilita toda la edición (se usa para "Ver")
    const esSoloLectura = modo === 'ver';
    // Modo corrección: solo permite editar cabecera no contable (typos en factura, etc.)
    const esCorreccion = modo === 'corregir';
    // Campos bloqueados cuando no se debe modificar la operación (estado, pagos, montos)
    const esBloqueado = esSoloLectura || esCorreccion;

    //area de las transacciones
    const [form, setForm] = useState({
        nombre: transaccion.nombre || '',
        descripcion: transaccion.descripcion || '',
        id_organizacion: transaccion.id_organizacion || '',
        monto: transaccion.monto ?? 0,
        monto_recibido: transaccion.monto_recibido ?? 0,
        vuelto:transaccion.vuelto ?? 0,
        iva: transaccion.iva ?? 0,
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

    // Cuotas para ventas a crédito/cuotas
    const [cuotasConfig, setCuotasConfig] = useState({
        numeroCuotas: 1,
        fechaPrimeraCuota: sumarDiasLocal(null, 30),
    });
    const [cuotas, setCuotas] = useState([]);

    // Determina si la venta es a crédito/cuotas según el tipo de pago seleccionado
    const tipoPagoSeleccionado = tipoPago.find(tp => String(tp.id) === String(form.id_TipoPago));
    const esCreditoOCuotas = tipoTransaccion === 'venta'
        && tipoPagoSeleccionado
        && ['crédito', 'credito', 'cuotas'].includes(String(tipoPagoSeleccionado.nombre || '').trim().toLowerCase());

    // Determina si la forma de pago es Efectivo (solo ahí aplican monto recibido y vuelto)
    const formaPagoSeleccionada = formaPago.find(fp => String(fp.id) === String(form.id_FormaPago));
    const esEfectivo = tipoTransaccion === 'venta'
        && formaPagoSeleccionada
        && String(formaPagoSeleccionada.nombre || '').trim().toLowerCase() === 'efectivo';

    // Determina si el tipo de comprobante seleccionado es una Factura, para
    // formatear el número de comprobante con guiones (001-002-0000001).
    const tipoComprobanteSeleccionado = tipoComprobante.find(tc => String(tc.id) === String(form.id_TipoComprobante));
    const esFactura = ['factura'].includes(String(tipoComprobanteSeleccionado?.nombre || '').trim().toLowerCase());

    //para personas
    const [personas, setPersonas] = useState([]);
    const [personaSeleccionada, setPersonaSeleccionada] = useState({
        id: transaccion.id_persona || '',
        nombre: transaccion.persona?.nombre || ''
    });
    const [busquedaPersona, setBusquedaPersona] = useState(transaccion.persona?.nombre || '');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const comboPersonaRef = useRef(null);

    //area del detalle
    const [transaccionDetalle, settransaccionDetalle] = useState([]);
    const [transaccionDetalleSeleccionado, setTransaccionDetalleSeleccionado] = useState({});


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

    //organizacion seleccionada
    const [organizacionSeleccionada, setorganizacionSeleccionada] = useState(transaccion.id_organizacion || '');
    const [organizaciones, setOrganizacion] = useState([]);

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [transaccionAEliminar, setTransaccionAEliminar] = useState(null);

    const nombreRef = useRef(null);
    // Snapshot del id original al abrir el modal: si no existía, es una transacción NUEVA.
    // Sirve para saber que, al cancelar, la cabecera auto-guardada (necesaria para cargar
    // detalles) debe anularse y no quedar en estado 'Activo' sin forma de cambiarla.
    const idOriginalRef = useRef(transaccion.id || null);
    const esTransaccionNueva = !idOriginalRef.current;
    // Enfocar el campo de nombre al abrir el modal
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);

    // Función única para crear/actualizar transacción
    const guardarTransaccion = async (modo, opciones = {}) => {
        const { finalizar = false, incluirCuotas = false } = opciones;
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });
            if (finalizar) {
                formData.append('finalizar', '1');
            }
            if (incluirCuotas && cuotas.length > 0) {
                formData.append('cuotas', JSON.stringify(cuotas));
            }
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
            const mensaje = error.response?.data?.message || 'Error al guardar la transaccion en la base de datos.';
            if (error.response && error.response.status === 422) {
                setErrores(error.response.data.errors || { general: [mensaje] });
            } else {
                setErrores({ general: [mensaje] });
            }
            return { success: false, message: mensaje };
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
    const etiquetaPersona = tipoTransaccion === 'compra'
        ? 'Proveedor'
        : tipoTransaccion === 'venta'
            ? 'Cliente'
            : 'Cliente / Proveedor';


    // Efecto para cargar personas basado en la búsqueda
    useEffect(() => {
        if (!mostrarSugerencias) {
            return undefined;
        }

        const fetchPersonas = async () => {
            const term = (busquedaPersona || '').trim();

            try {
                const params = new URLSearchParams({ all: '1' });

                if (term) {
                    params.append('search', term);
                }

                if (tipoPersonaFiltro !== null) {
                    params.append('tipo_persona', tipoPersonaFiltro);
                }
                //en el combo muestro solo los activos, por eso el filtro de estado 1=activo
                params.append('id_tipoestado', '1');
                

                const { data } = await clienteAxios.get(`api/personas?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const lista = data?.data || data || [];
                setPersonas(Array.isArray(lista) ? lista : []);
            } catch (error) {
                console.error("Error al buscar personas", error);
                setPersonas([]);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchPersonas();
        }, 300); // Debounce de 300ms

        return () => clearTimeout(delayDebounceFn);
    }, [busquedaPersona, mostrarSugerencias, tipoPersonaFiltro, token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (comboPersonaRef.current && !comboPersonaRef.current.contains(event.target)) {
                setMostrarSugerencias(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const abrirComboPersona = () => {
        setBusquedaPersona('');
        setMostrarSugerencias(true);
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

    // Calcular vuelto e IVA automáticamente cuando cambia el monto o el monto recibido
    useEffect(() => {
        const monto = Number(form.monto) || 0;
        const montoRecibido = Number(form.monto_recibido) || 0;

        // Vuelto: diferencia entre lo recibido y el total (nunca negativo).
        // Solo aplica si hay un monto definido (evita vuelto = montoRecibido con monto 0).
        const vueltoCalculado = monto > 0 && montoRecibido > monto ? montoRecibido - monto : 0;

        // IVA: 10% sobre la base imponible (monto / 11 = IVA incluido paraguayo)
        const ivaCalculado = Math.round(monto / 11);

        setForm(prev => {
            // Solo actualizar si hay cambio real para evitar renders innecesarios
            if (prev.vuelto === vueltoCalculado && prev.iva === ivaCalculado) {
                return prev;
            }
            return { ...prev, vuelto: vueltoCalculado, iva: ivaCalculado };
        });
    }, [form.monto, form.monto_recibido]);

    // Si la forma de pago no es Efectivo, el monto recibido no aplica → se limpia
    useEffect(() => {
        if (tipoTransaccion === 'venta' && !esEfectivo && form.id_FormaPago) {
            setForm(prev => {
                if (Number(prev.monto_recibido) === 0) {
                    return prev;
                }
                return { ...prev, monto_recibido: 0 };
            });
        }
    }, [esEfectivo, tipoTransaccion, form.id_FormaPago]);

    // Generar el plan de cuotas cuando cambia la configuración o el monto
    useEffect(() => {
        if (!esCreditoOCuotas) {
            setCuotas([]);
            return;
        }

        const montoTotal = Math.round(Number(form.monto) || 0);
        const n = Math.max(1, parseInt(cuotasConfig.numeroCuotas, 10) || 1);
        const fechaInicio = cuotasConfig.fechaPrimeraCuota;

        if (montoTotal <= 0 || !fechaInicio) {
            setCuotas([]);
            return;
        }

        const montoCuota = Math.floor(montoTotal / n);
        let acumulado = 0;
        const lista = [];
        for (let i = 0; i < n; i++) {
            const monto = (i === n - 1) ? (montoTotal - acumulado) : montoCuota;
            acumulado += monto;
            lista.push({
                numero: i + 1,
                monto,
                fecha_vencimiento: sumarDiasLocal(fechaInicio, i * 30),
            });
        }
        setCuotas(lista);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esCreditoOCuotas, cuotasConfig, form.monto]);

    // Actualiza un campo de una cuota específica
    const actualizarCuota = (index, campo, valor) => {
        setCuotas(prev => prev.map((c, i) => {
            if (i !== index) return c;
            return { ...c, [campo]: campo === 'monto' ? (Number(valor) || 0) : valor };
        }));
    };

    // Actualizar el estado del formulario cuando cambie la transaccion
    useEffect(() => {
        if (modo === 'editar') {
            setForm({
                nombre: transaccion.nombre || '',
                id_organizacion: transaccion.id_organizacion || '',
                descripcion: transaccion.descripcion || '',
                monto: transaccion.monto ?? 0,
                monto_recibido: transaccion.monto_recibido ?? 0,
                vuelto:transaccion.vuelto ?? 0,
                iva: transaccion.iva ?? 0,
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



    // Cargar datos iniciales en paralelo desde la API
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const tipoEstadoUrl = tipoTransaccion === 'compra'
                    ? 'api/tipo_estado?filtro=compra'   // compra: Activo/Inactivo/Finalizado
                    : tipoTransaccion === 'venta'
                        ? 'api/tipo_estado?filtro=venta' // venta: Activo/Inactivo/Finalizado
                        : 'api/tipo_estado';              // ajuste: todos los estados

                const [tpRes, fpRes, teRes, tcRes, orgRes] = await Promise.all([
                    clienteAxios.get('api/tipo_pago', { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get('api/forma_pago', { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get(tipoEstadoUrl, { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get('api/tipo_comprobante', { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get('api/organizacion?all=true', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setTipoPago(tpRes.data);
                setFormaPago(fpRes.data);
                setTipoEstado(teRes.data);
                setOrganizacion(orgRes.data);

                // En compras el tipo de comprobante es SIEMPRE Factura: se filtra
                // la lista a solo Factura y queda predefinida (y bloqueada) en el combo.
                let tiposComprobante = tcRes.data;
                if (tipoTransaccion === 'compra') {
                    const factura = (tiposComprobante || []).find(tc =>
                        String(tc.nombre || '').trim().toLowerCase() === 'factura'
                    );
                    if (factura) {
                        tiposComprobante = [factura];
                        setForm(prev => ({ ...prev, id_TipoComprobante: String(factura.id) }));
                    }
                }

                // En ventas se permiten Factura, Ticket, Nota de Crédito y Nota de Débito
                // (se excluye Boleta, que no es un comprobante fiscal).
                if (tipoTransaccion === 'venta') {
                    const permitidosVenta = ['factura', 'ticket', 'nota de crédito', 'nota de debito'];
                    tiposComprobante = (tiposComprobante || []).filter(tc =>
                        permitidosVenta.includes(String(tc.nombre || '').trim().toLowerCase())
                    );
                }
                setTipoComprobante(tiposComprobante);

                if (teRes.data?.length && !form.id_TipoEstado) {
                    setForm(prev => ({ ...prev, id_TipoEstado: String(teRes.data[0].id) }));
                }
            } catch (error) {
                console.error("Error al cargar los datos iniciales", error);
            }
        };

        fetchInitialData();
    }, []);


    // Validación: el monto recibido (y el vuelto) solo aplica cuando la venta se paga en EFECTIVO.
    const validarMontoRecibido = () => {
        if (tipoTransaccion === 'venta' && esEfectivo && !esCreditoOCuotas) {
            const monto = Number(form.monto) || 0;
            const montoRecibido = Number(form.monto_recibido) || 0;
            if (montoRecibido <= 0) {
                setErrores({ monto_recibido: ['Debe cargar el monto recibido en efectivo.'] });
                return false;
            }
            if (montoRecibido < monto) {
                setErrores({ monto_recibido: ['El monto recibido no puede ser menor al monto total.'] });
                return false;
            }
        }
        return true;
    };

    // Guarda SOLO los campos de cabecera no contables (corrección de typos)
    const guardarCorreccion = async () => {
        if (isSaving || !transaccion.id) {
            return;
        }

        setIsSaving(true);
        setErrores({});
        try {
            const response = await clienteAxios.post(`api/transacciones/${transaccion.id}/corregir`, {
                nombre: form.nombre,
                descripcion: form.descripcion || null,
                fecha: form.fecha,
                nro_comprobante: form.nro_comprobante || null,
                id_TipoComprobante: form.id_TipoComprobante || null,
                id_persona: form.id_persona || null,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(response.data?.message || 'Corrección guardada correctamente.');
            if (refrescarTransacciones !== null && typeof refrescarTransacciones === 'function') {
                refrescarTransacciones();
            }
            onClose();
        } catch (error) {
            if (error.response?.status === 422) {
                setErrores(error.response.data.errors || {});
            }
            toast.error(error.response?.data?.message || 'Error al corregir la transacción.');
        } finally {
            setIsSaving(false);
        }
    };

    // Función para manejar la creación o edición de la transaccion
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (esSoloLectura || isSaving) {
            return;
        }

        // En modo corrección solo se actualiza la cabecera no contable
        if (esCorreccion) {
            await guardarCorreccion();
            return;
        }

        if (!validarMontoRecibido()) {
            return;
        }

        setIsSaving(true);
        setErrores({});
        try {
            // Si la venta es a crédito/cuotas, exigir cuotas configuradas
            if (tipoTransaccion === 'venta' && esCreditoOCuotas && cuotas.length === 0) {
                toast.warning('Configurá el plan de cuotas de la venta.');
                setIsSaving(false);
                return;
            }

            const result = await guardarTransaccion(modo, {
                finalizar: tipoTransaccion === 'compra' || tipoTransaccion === 'venta',
                incluirCuotas: tipoTransaccion === 'venta' && esCreditoOCuotas,
            });
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

    // Cerrar el modal (botón Cancelar o clic fuera). Si es una transacción NUEVA que ya
    // guardó la cabecera (por haber agregado detalles) pero NO se finalizó, se anula
    // primero para que no quede en estado 'Activo' sin forma de cambiarla.
    const manejarCerrar = () => {
        if (esTransaccionNueva && transaccion.id) {
            setTransaccionAEliminar(transaccion.id);
            setAccionConfirmadaModal('cancelar_transaccion');
            setTipoAlertaModal('confirmacion');
            setMensajeAlertaModal(
                totalRegistros > 0
                    ? 'La transacción tiene detalles cargados. ¿Anularla? Se revertirá el stock y quedará como Anulada.'
                    : '¿Anular la transacción? Se marcará como Anulada para que no quede en estado Activo.'
            );
            setMostrarAlertaModal(true);
            return;
        }
        onClose();
    };

    // Confirma la anulación de una transacción nueva cancelada (reutiliza /anular:
    // revierte el stock de los detalles y marca estado 7 = Anulada).
    const confirmarCancelarTransaccion = async () => {
        const id = transaccionAEliminar;
        setTransaccionAEliminar(null);
        try {
            await clienteAxios.post(`api/transacciones/${id}/anular`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Transacción cancelada correctamente.');
            if (refrescarTransacciones !== null && typeof refrescarTransacciones === 'function') {
                refrescarTransacciones();
            }
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cancelar la transacción.');
        }
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal === 'delete') {
            confirmarEliminacion();
        } else if (accionConfirmadaModal === 'cancelar_transaccion') {
            confirmarCancelarTransaccion();
        }
    };
    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };





    return (
        <div className="fixed inset-0 flex items-center justify-center z-[1035]">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0 z-[1031]" onClick={manejarCerrar}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg relative z-[1036] p-3 sm:p-6 w-[95vw] max-w-full sm:max-w-5xl border border-red-500 overflow-y-auto max-h-screen">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">
                    {modo === 'crear' ? `Crear ${tipoTransaccion}` : modo === 'editar' ? `Editar ${tipoTransaccion}` : modo === 'corregir' ? `Corregir ${tipoTransaccion}` : `Ver ${tipoTransaccion}`}
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
                                    ref={nombreRef}
                                    disabled={esSoloLectura}
                                    className={`w-full px-3 py-2 border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esSoloLectura ? 'bg-gray-100 text-gray-600' : ''}`}
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
                                    disabled={esSoloLectura}
                                    className={`w-full px-3 py-2 border ${errores.fecha ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esSoloLectura ? 'bg-gray-100 text-gray-600' : ''}`}
                                    placeholder="Introduce la fecha"
                                    value={form.fecha}
                                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                />

                                {errores.fecha && <p className="text-red-500 text-sm">{errores.fecha[0]}</p>}
                            </div>

                            {/* Tipo de comprobante */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de comprobante</label>
                                <select
                                    disabled={esSoloLectura || tipoTransaccion === 'compra'}
                                    className={`w-full px-3 py-2 border ${errores.id_TipoComprobante ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esSoloLectura || tipoTransaccion === 'compra' ? 'bg-gray-100 text-gray-600' : ''}`}
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
                                    disabled={esSoloLectura}
                                    className={`w-full px-3 py-2 border ${errores.nro_comprobante ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esSoloLectura ? 'bg-gray-100 text-gray-600' : ''}`}
                                    placeholder={esFactura ? '001-002-0000001' : 'Introduce el comprobante'}
                                    value={esFactura ? formatearNroFactura(form.nro_comprobante) : (form.nro_comprobante || '')}
                                    onChange={(e) => {
                                        if (esFactura) {
                                            // En factura se guarda el número YA formateado con guiones (el campo es varchar)
                                            setForm({ ...form, nro_comprobante: formatearNroFactura(e.target.value) });
                                        } else {
                                            setForm({ ...form, nro_comprobante: e.target.value });
                                        }
                                    }}
                                />
                                {errores.nro_comprobante && <p className="text-red-500 text-sm">{errores.nro_comprobante[0]}</p>}
                            </div>

                            {/* Forma de pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Forma de pago</label>
                                <select
                                    disabled={esBloqueado}
                                    className={`w-full px-3 py-2 border ${errores.id_FormaPago ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esBloqueado ? 'bg-gray-100 text-gray-600' : ''}`}
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
                                    disabled={esBloqueado}
                                    className={`w-full px-3 py-2 border ${errores.id_TipoPago ? 'border-red-500' : 'border-gray-300'} bg-white  rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esBloqueado ? 'bg-gray-100 text-gray-600' : ''}`}
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
                            {/* <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de estado</label>
                                <select
                                    disabled={esBloqueado}
                                    className={`w-full px-3 py-2 border ${errores.id_TipoEstado ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esBloqueado ? 'bg-gray-100 text-gray-600' : ''}`}
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
                            </div> */}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organizacion</label>
                                <select
                                    disabled={esBloqueado}
                                    className={`w-full px-3 py-2 border ${errores.id_organizacion ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esBloqueado ? 'bg-gray-100 text-gray-600' : ''}`}
                                    value={organizacionSeleccionada}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setorganizacionSeleccionada(id);
                                        setForm(prev => ({ ...prev, id_organizacion: id }));
                                    }}
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


                            {/* Campo para Persona (Proveedor/Cliente) */}
                            <div className="mb-2 col-span-2 relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {etiquetaPersona}
                                </label>
                                <div ref={comboPersonaRef} className="relative">
                                    <button
                                        type="button"
                                        disabled={esSoloLectura}
                                        onClick={() => {
                                            if (mostrarSugerencias) {
                                                setMostrarSugerencias(false);
                                            } else {
                                                abrirComboPersona();
                                            }
                                        }}
                                        className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores.id_persona ? 'border-red-500' : 'border-gray-300'} ${esSoloLectura ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                                    >
                                        <span className={`${personaSeleccionada.nombre ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {personaSeleccionada.nombre || `Seleccionar ${etiquetaPersona.toLowerCase()}`}
                                        </span>
                                        <span className="text-sm text-gray-500">▼</span>
                                    </button>

                                    {personaSeleccionada.id && (
                                        <button
                                            type="button"
                                            onClick={limpiarPersona}
                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            ×
                                        </button>
                                    )}

                                    {mostrarSugerencias && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
                                            <div className="border-b border-gray-200 p-2">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder={`Buscar ${etiquetaPersona.toLowerCase()}...`}
                                                    value={busquedaPersona}
                                                    onChange={(e) => setBusquedaPersona(e.target.value)}
                                                />
                                            </div>

                                            <ul className="max-h-60 overflow-auto">
                                                {personas.length > 0 ? (
                                                    personas.map((persona) => (
                                                        <li
                                                            key={persona.id}
                                                            className="cursor-pointer border-b border-gray-100 px-3 py-2 hover:bg-blue-50 last:border-b-0"
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
                                                    ))
                                                ) : (
                                                    <li className="px-3 py-3 text-sm text-gray-500">
                                                        No se encontraron {etiquetaPersona.toLowerCase()}s.
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

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
                            
                            {/* Campos exclusivos para venta */}
                            {tipoTransaccion === 'venta' && (
                            <>
                                {/* Monto Recibido y Vuelto solo aplican con forma de pago EFECTIVO.
                                    En modo "ver" (solo lectura) también se muestran si hay datos guardados. */}
                                {(esEfectivo || (esSoloLectura && (Number(form.monto_recibido) > 0 || Number(form.vuelto) > 0))) && (
                                <>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Recibido</label>
                                    <input
                                        type="text"
                                        disabled={esBloqueado}
                                        className={`w-full px-3 py-2 border ${errores.monto_recibido ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esBloqueado ? 'bg-gray-100 text-gray-600' : ''}`}
                                        placeholder="Monto recibido en Gs."
                                        value={formatearGuarani(form.monto_recibido) || ''}
                                        onChange={(e) => {
                                            const valorDigitado = e.target.value;
                                            const soloNumeros = valorDigitado.replace(/\D/g, '');
                                            setForm({ ...form, monto_recibido: soloNumeros });
                                        }}
                                    />
                                    {errores.monto_recibido && <p className="text-red-500 text-sm">{errores.monto_recibido[0]}</p>}
                                </div>

                                <div className="mb-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vuelto</label>
                                    <input
                                        type="text"
                                        className={`w-full px-3 py-2 border ${errores.vuelto ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="Vuelto en Gs."
                                        disabled
                                        value={formatearGuarani(form.vuelto) || ''}
                                    />
                                    {errores.vuelto && <p className="text-red-500 text-sm">{errores.vuelto[0]}</p>}
                                </div>
                                </>
                                )}

                                <div className="mb-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                                    <input
                                        type="text"
                                        className={`w-full px-3 py-2 border ${errores.iva ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="IVA en Gs."
                                        disabled
                                        value={formatearGuarani(form.iva) || ''}
                                    />
                                    {errores.iva && <p className="text-red-500 text-sm">{errores.iva[0]}</p>}
                                </div>
                            </>
                            )}

                        </div>
                    </div>

                    {/* ── Panel de cuotas (solo ventas a crédito/cuotas) ── */}
                    {esCreditoOCuotas && (
                        <div className="mb-4 w-full border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                            <h3 className="font-semibold text-gray-700 mb-3">Plan de cuotas</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de cuotas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={cuotasConfig.numeroCuotas}
                                        onChange={(e) => setCuotasConfig(prev => ({ ...prev, numeroCuotas: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Primera cuota</label>
                                    <input
                                        type="date"
                                        value={cuotasConfig.fechaPrimeraCuota}
                                        onChange={(e) => setCuotasConfig(prev => ({ ...prev, fechaPrimeraCuota: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold">Total:</span> {formatearGuarani(form.monto)}
                                    </div>
                                </div>
                            </div>

                            {cuotas.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">N°</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Monto</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vencimiento</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {cuotas.map((cuota, idx) => (
                                                <tr key={idx} className="transition-colors hover:bg-blue-50/50">
                                                    <td className="px-3 py-3 text-center text-sm text-gray-700">{cuota.numero}</td>
                                                    <td className="px-3 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={cuota.monto}
                                                            onChange={(e) => actualizarCuota(idx, 'monto', e.target.value)}
                                                            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-right text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            type="date"
                                                            value={cuota.fecha_vencimiento}
                                                            onChange={(e) => actualizarCuota(idx, 'fecha_vencimiento', e.target.value)}
                                                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Ingresá el monto de la venta y la fecha para generar las cuotas.</p>
                            )}
                        </div>
                    )}

                    {/* Campo para Descripción: textarea ubicado debajo de los inputs y antes de la grilla */}
                    <div className="mb-4 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            rows={3}
                            disabled={esSoloLectura}
                            className={`w-full px-3 py-2 border ${errores.descripcion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${esSoloLectura ? 'bg-gray-100 text-gray-600' : ''}`}
                            placeholder="Introduce la descripción"
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        />
                        {errores.descripcion && <p className="text-red-500 text-sm">{errores.descripcion[0]}</p>}
                    </div>

                    {/* Grilla de detalles */}
                    <div className="mt-1">
                        <div className="flex  items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{`Detalles de ${tipoTransaccion}`}</h3>
                            {!esBloqueado && (
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
                            )}
                        </div>

                        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Lote</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Código de barra</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Producto</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cantidad</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Precio unitario</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vencimiento</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Sub total</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transaccionDetalle && transaccionDetalle.length > 0 ? (
                                        transaccionDetalle.map((detalle, id) => (
                                            <tr key={id} className="transition-colors hover:bg-blue-50/50">
                                                <td className="px-3 py-3 text-sm text-gray-700">{detalle?.lote || '—'}</td>
                                                <td className="px-3 py-3 text-sm text-gray-600">{detalle?.producto?.codigo_barras}</td>
                                                <td className="px-3 py-3 text-sm font-medium text-gray-900">{detalle?.producto?.nombre}</td>
                                                <td className="px-3 py-3 text-right text-sm tabular-nums text-gray-700">{formatearMiles(Number(detalle?.cantidad))}</td>
                                                <td className="px-3 py-3 text-right text-sm tabular-nums text-gray-700">{formatearGuarani(detalle?.precio_unitario)}</td>
                                                <td className="px-3 py-3 text-sm text-gray-600">{detalle?.fecha_vencimiento || 'Sin fecha'}</td>
                                                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">{formatearGuarani(detalle?.subtotal)}</td>
                                                <td className="px-3 py-3">
                                                    {esBloqueado ? (
                                                        <span className="text-gray-400">—</span>
                                                    ) : (
                                                        <div className="flex justify-end gap-1">
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
                                                                }} className="flex items-center rounded-md p-1.5 transition-colors hover:bg-blue-100 focus:outline-none">
                                                                <img src="/img/Icon/edit.png" alt="Edit" className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type='button'
                                                                onClick={() => handleDelete(detalle.id)} className="flex items-center rounded-md p-1.5 transition-colors hover:bg-red-100 focus:outline-none">
                                                                <img src="/img/Icon/trash_bin-remove.png" alt="Delete transaccion detalle" className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-400">
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
                    {esSoloLectura ? (
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : esCorreccion ? (
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
                                {isSaving ? 'Guardando...' : 'Guardar corrección'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-end space-x-3 mt-2">
                            <button
                                type="button"
                                onClick={manejarCerrar}
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
                    )}
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
                    tipoTransaccion={tipoTransaccion}
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
