import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import ModalTransaccion from "../components/ModalTransaccion";
import ModalComprobante from "../components/ModalComprobante";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerTransacciones } from '../helpers/HelpersTransacciones.jsx';
import { formatearMiles, formatearGuarani } from '../helpers/HelpersNumeros';
import { formatDateTimeToMinutes, formatDateToInput } from '../helpers/HelpersFechas';
import dayjs from "dayjs";
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";

const FILTROS_VENTAS = [
    {
        key: 'search',
        label: 'Buscar venta',
        type: 'text',
        placeholder: 'Buscar venta...',
    },
    {
        key: 'fecha_desde',
        label: 'Fecha desde',
        type: 'date',
    },
    {
        key: 'fecha_hasta',
        label: 'Fecha hasta',
        type: 'date',
    },
];

const inicioMesActual = dayjs().startOf('year').format('YYYY-MM-DD');
const finMesActual = dayjs().endOf('year').format('YYYY-MM-DD');

const FILTROS_VENTAS_INICIALES = {
    search: '',
    fecha_desde: inicioMesActual,
    fecha_hasta: finMesActual,
};

export default function Ventas() {
    //grilla de las ventas 
    const [ventas, setVentas] = useState([]);
    const [ventaSeleccionado, setVentaSeleccionado] = useState(null);

    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_VENTAS_INICIALES }));

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [ventaAAnular, setVentaAAnular] = useState(null);

    //comprobante de venta (reimpresión)
    const [comprobante, setComprobante] = useState(null); // { datos, anulada }
    const [mostrarComprobante, setMostrarComprobante] = useState(false);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, ventaSeleccionado = {}) => {
        setModalMode(modo);
        setVentaSeleccionado(ventaSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las ventas
    //Tipo de movimientos 1=compra 2=venta 3=ajustes
    const fetchVentas = useCallback(async (page = 1, filtros = filtrosAplicados, tipo = 2) => {
        try {
            const ventas = await obtenerTransacciones(page, '', '', tipo, filtros);
            setVentas(ventas.transacciones.data);
            setTotalPaginas(ventas.transacciones.last_page);
            setTotalRegistros(ventas.transacciones.total);
            setPaginaActual(ventas.transacciones.current_page);
            setSubTotal(ventas.subtotal ?? ventas.transacciones?.subtotal ?? 0);
        } catch (error) {
            console.error('Error al cargar las ventas:', error);
        }
    }, [filtrosAplicados]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchVentas(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchVentas]);

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la anulacion de ventas (estilo SAP: no se borra, se anula)
    const handleAnular = (venta) => {
        setVentaAAnular(venta);
        setAccionConfirmadaModal('anular');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Estás seguro de que deseas anular la venta #${venta.id}? Se revertirá el stock de los productos.`);
        setMostrarAlertaModal(true);
    };

    const confirmarAnulacion = async () => {
        try {
            const response = await clienteAxios.post(`api/transacciones/${ventaAAnular.id}/anular`, {}, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success(response.data?.message || 'Venta anulada correctamente.');
            fetchVentas();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal(error.response?.data?.message || 'Hubo un problema al anular la venta.');
            setMostrarAlertaModal(true);
        } finally {
            setVentaAAnular(null);
        }
    }


    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal === 'anular') {
            confirmarAnulacion();
        }

    };

    const handleVer = (venta) => {
        openModal('ver', venta);
    };

    // Recupera el snapshot guardado (lo que se imprimió) y abre la vista previa
    // para reimprimir SIEMPRE lo mismo, aunque las tablas relacionadas hayan cambiado.
    const handleReimprimir = async (venta) => {
        try {
            const { data } = await clienteAxios.get(`api/ventas/${venta.id}/comprobante`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const datos = data?.comprobante?.datos;
            if (!datos) {
                toast.warning('La venta no posee un comprobante guardado.');
                return;
            }
            setComprobante({ datos, anulada: Number(venta.id_TipoEstado) === 7 });
            setMostrarComprobante(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo recuperar el comprobante.');
        }
    };

    const cerrarComprobante = () => {
        setMostrarComprobante(false);
        setComprobante(null);
    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    const handleAdd = () => {
        openModal('crear')
    };

    // Devuelve las clases del badge según el estado de la transacción
    const claseEstadoTransaccion = (id) => {
        if (Number(id) === 3) return 'bg-green-100 text-green-700 ring-green-200'; // Finalizado
        if (Number(id) === 7) return 'bg-red-100 text-red-700 ring-red-200';       // Anulada
        if (Number(id) === 1) return 'bg-amber-100 text-amber-700 ring-amber-200'; // Activo / borrador
        return 'bg-slate-100 text-slate-600 ring-slate-200';                       // resto
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <FiltrosBar
                            title="Ventas"
                            buttonLabel="Añadir venta"
                            onAdd={handleAdd}
                            filterDefinitions={FILTROS_VENTAS}
                            initialValues={FILTROS_VENTAS_INICIALES}
                            onApply={handleAplicarFiltros}
                        />


                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="g360-gradient text-center font-bold">
                                            <th>ID</th>
                                            <th>Organización</th>
                                            <th>Nro. Comprobante</th>
                                            <th>Nombre</th>
                                            <th>Descripción</th>
                                            <th>Cliente</th>
                                            <th className="text-right">Monto</th>
                                            <th className="text-right">Monto recibido</th>
                                            <th className="text-right">Vuelto</th>
                                            <th className="text-center">Estado</th>
                                            <th className="text-right">Urev</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventas.length === 0 ? (
                                            <NoExistenDatos colSpan={12} mensaje="No existen ventas." />
                                        ) : (

                                            ventas.map((venta) => (
                                                <tr key={venta.id}>
                                                    <td className="text-center tabular-nums">{venta.id}</td>
                                                    <td>{venta.organizacion?.RazonSocial || 'Sin organización'}</td>
                                                    <td className="text-center tabular-nums">{venta.nro_comprobante}</td>
                                                    <td className="font-medium text-slate-800">{venta.nombre}</td>
                                                    <td className="text-slate-600">{venta.descripcion}</td>
                                                    <td>{venta.persona ? venta.persona.nombre : 'Sin cliente'}</td>
                                                    <td className="text-right font-semibold tabular-nums">{formatearGuarani(venta.monto)}</td>
                                                    <td className="text-right tabular-nums">{formatearGuarani(venta.monto_recibido) || '—'}</td>
                                                    <td className="text-right tabular-nums">{formatearGuarani(venta.vuelto) || '—'}</td>
                                                    <td className="text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${claseEstadoTransaccion(venta.id_TipoEstado)}`}>
                                                            {venta.tipo_estado?.descripcion || 'Sin estado'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right tabular-nums">{venta.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {/* Reimprimir comprobante (solo si la venta tiene snapshot guardado) */}
                                                            {venta.comprobante && (
                                                                <button onClick={() => handleReimprimir(venta)} title="Reimprimir comprobante" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                    <img src="/img/Icon/report-print.png" alt="Reimprimir" />
                                                                </button>
                                                            )}
                                                            {/* Ver detalle (solo lectura) */}
                                                            <button onClick={() => handleVer(venta)} title="Ver detalle" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                <img src="/img/Icon/eye.png" alt="Ver" />
                                                            </button>
                                                            {/* Corregir cabecera (oculto si ya está anulada) */}
                                                            {Number(venta.id_TipoEstado) !== 7 && (
                                                                <button onClick={() => openModal('corregir', venta)} title="Corregir datos" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                    <img src="/img/Icon/edit.png" alt="Corregir" />
                                                                </button>
                                                            )}
                                                            {/* Anular (oculto si ya está anulada) */}
                                                            {Number(venta.id_TipoEstado) !== 7 && (
                                                                <button onClick={() => handleAnular(venta)} title="Anular venta" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                    <img src="/img/Icon/rotate.png" alt="Anular" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))


                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-x-8 gap-y-1 border-t border-slate-200 pt-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold text-slate-600">Total de registros:</span>
                                    <span className="text-lg font-bold tabular-nums text-slate-800">{totalRegistros}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold text-slate-600">Sub Total:</span>
                                    <span className="text-lg font-bold tabular-nums text-slate-800">{formatearGuarani(subTotal)} gs.</span>
                                </div>
                            </div>

                            {/* Controles de paginación */}
                            <div className="flex flex-col items-center sm:flex-row sm:justify-between py-4 space-y-2 sm:space-y-0">
                                {/* Botones para la primera y anterior página */}
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={paginaActual === 1}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Primera
                                    </button>
                                    <button
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
                                        onClick={() => handlePageChange(paginaActual + 1)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Siguiente
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPaginas)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Última
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
            {/* Renderizar el modal */}
            {isModalOpen && (
                <ModalTransaccion
                    refrescarTransacciones={fetchVentas}
                    transaccion={ventaSeleccionado}
                    tipoTransaccion='venta'
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}

            {/* Modal de reimpresión del comprobante de venta */}
            {mostrarComprobante && comprobante && (
                <ModalComprobante
                    datos={comprobante.datos}
                    modo="reimpresion"
                    anulada={comprobante.anulada}
                    onClose={cerrarComprobante}
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

