import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";
import { formatearGuarani } from '../helpers/HelpersNumeros';
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";

const FILTROS_COBRANZAS = [
    {
        key: 'search',
        label: 'Buscar',
        type: 'text',
        placeholder: 'Cliente o venta...',
    },
    {
        key: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
            { key: 'Pendientes', value: 'pendiente' },
            { key: 'Pagadas', value: 'pagada' },
            { key: 'Todas', value: 'todas' },
        ],
    },
    {
        key: 'fecha_desde',
        label: 'Vencimiento desde',
        type: 'date',
    },
    {
        key: 'fecha_hasta',
        label: 'Vencimiento hasta',
        type: 'date',
    },
];

const FILTROS_INICIALES = {
    search: '',
    estado: 'pendiente',
    fecha_desde: '',
    fecha_hasta: '',
};

function formatearFechaVista(fecha) {
    if (!fecha) return '—';
    const [y, m, d] = String(fecha).split('T')[0].split('-');
    if (!y || !m || !d) return fecha;
    return `${d}/${m}/${y}`;
}

export default function Cobranzas() {
    const [cuotas, setCuotas] = useState([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subtotalPendiente, setSubtotalPendiente] = useState(0);
    const [subtotalPagado, setSubtotalPagado] = useState(0);
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_INICIALES }));

    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);

    const token = localStorage.getItem('AUTH_TOKEN');

    const fetchCuotas = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const params = new URLSearchParams({ page: String(page) });
            // Solo cuotas de ventas (mov 2 = venta)
            params.append('tipo_movimiento', '2');
            Object.entries(filtros).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });

            const { data } = await clienteAxios.get(`api/cuotas?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCuotas(data.cuotas?.data || []);
            setTotalPaginas(data.cuotas?.last_page || 1);
            setTotalRegistros(data.cuotas?.total || 0);
            setPaginaActual(data.cuotas?.current_page || 1);
            setSubtotalPendiente(data.subtotalPendiente || 0);
            setSubtotalPagado(data.subtotalPagado || 0);
        } catch (error) {
            console.error('Error al cargar las cuotas:', error);
        }
    }, [filtrosAplicados, token]);

    useEffect(() => {
        fetchCuotas(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchCuotas]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage);
        }
    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    const solicitarPago = (cuota) => {
        setCuotaSeleccionada(cuota);
        setAccionConfirmadaModal('pagar');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Registrar como pagada la cuota #${cuota.numero} por ${formatearGuarani(cuota.monto)}?`);
        setMostrarAlertaModal(true);
    };

    const solicitarRevertir = (cuota) => {
        setCuotaSeleccionada(cuota);
        setAccionConfirmadaModal('revertir');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Revertir el pago de la cuota #${cuota.numero}? Volverá a estado pendiente.`);
        setMostrarAlertaModal(true);
    };

    const confirmarAccion = async () => {
        if (!cuotaSeleccionada) return;

        const endpoint = accionConfirmadaModal === 'pagar'
            ? `api/cuotas/${cuotaSeleccionada.id}/pagar`
            : `api/cuotas/${cuotaSeleccionada.id}/revertir`;

        try {
            const { data } = await clienteAxios.post(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            toast.success(data?.message || 'Operación realizada correctamente.');
            setMostrarAlertaModal(false);
            fetchCuotas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Hubo un problema al procesar la operación.');
            setMostrarAlertaModal(false);
        } finally {
            setCuotaSeleccionada(null);
        }
    };

    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
        setCuotaSeleccionada(null);
    };

    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <FiltrosBar
                            title="Cobranzas"
                            filterDefinitions={FILTROS_COBRANZAS}
                            initialValues={FILTROS_INICIALES}
                            onApply={handleAplicarFiltros}
                        />

                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>N°</th>
                                            <th>Venta</th>
                                            <th>Cliente</th>
                                            <th>Vencimiento</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuotas.length === 0 ? (
                                            <NoExistenDatos colSpan={7} mensaje="No existen cuotas." />
                                        ) : (
                                            cuotas.map((cuota) => (
                                                <tr key={cuota.id}>
                                                    <td className="text-center">{cuota.numero}</td>
                                                    <td>{cuota.transaccion?.nombre || `Venta #${cuota.id_transaccion}`}</td>
                                                    <td>{cuota.transaccion?.persona?.nombre || 'Consumidor Final'}</td>
                                                    <td className="text-center">{formatearFechaVista(cuota.fecha_vencimiento)}</td>
                                                    <td className="text-end">{formatearGuarani(cuota.monto)}</td>
                                                    <td className="text-center">
                                                        {cuota.tipo_estado?.descripcion === 'Finalizado' ? (
                                                            <span className="text-green-600 font-semibold">Pagada</span>
                                                        ) : (
                                                            <span className="text-amber-600 font-semibold">Pendiente</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {cuota.tipo_estado?.descripcion === 'Finalizado' ? (
                                                            <button
                                                                onClick={() => solicitarRevertir(cuota)}
                                                                className="text-sm text-slate-500 hover:text-red-600"
                                                            >
                                                                Revertir
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => solicitarPago(cuota)}
                                                                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                                                            >
                                                                Registrar pago
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between mt-3 gap-2">
                                <span className="text-lg font-semibold text-gray-700">
                                    Total de registros: <span className="font-bold">{totalRegistros}</span>
                                </span>
                                <span className="text-lg font-semibold text-green-700">
                                    Pendiente: <span className="font-bold">{formatearGuarani(subtotalPendiente)} gs.</span>
                                </span>
                                <span className="text-lg font-semibold text-gray-700">
                                    Pagado (página): <span className="font-bold">{formatearGuarani(subtotalPagado)} gs.</span>
                                </span>
                            </div>

                            {/* Controles de paginación */}
                            <div className="flex flex-col items-center sm:flex-row sm:justify-between py-4 space-y-2 sm:space-y-0">
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

                                <span className="text-sm sm:text-lg font-medium text-center">
                                    Página {paginaActual} de {totalPaginas}
                                </span>

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

            {mostrarAlertaModal && (
                <AlertaModal
                    tipo={tipoAlertaModal}
                    mensaje={mensajeAlertaModal}
                    onClose={handleClose}
                    onConfirm={confirmarAccion}
                />
            )}
        </div>
    );
}
