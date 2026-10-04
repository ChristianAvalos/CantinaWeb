import { useCallback, useEffect, useState } from 'react';
import ModalTransaccion from '../components/ModalTransaccion';
import AlertaModal from "../components/AlertaModal"
import { toast } from "react-toastify";
import clienteAxios from "../config/axios";
import { obtenerTransacciones } from '../helpers/HelpersTransacciones';
import { formatearGuarani } from '../helpers/HelpersNumeros';
import dayjs from "dayjs";
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";

const TIPO_POR_MOVIMIENTO = { 1: 'compra', 2: 'venta', 3: 'ajuste' };
const ETIQUETA_TIPO = { 1: 'Compra', 2: 'Venta', 3: 'Ajuste' };

const FILTROS_TRANSACCIONES = [
    {
        key: 'search',
        label: 'Buscar',
        type: 'text',
        placeholder: 'Comprobante, persona, descripción...',
    },
    {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: [
            { key: 'Todas', value: '' },
            { key: 'Compras', value: '1' },
            { key: 'Ventas', value: '2' },
            { key: 'Ajustes', value: '3' },
        ],
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

const inicioAnio = dayjs().startOf('year').format('YYYY-MM-DD');
const finAnio = dayjs().endOf('year').format('YYYY-MM-DD');

const FILTROS_TRANSACCIONES_INICIALES = {
    search: '',
    tipo: '',
    fecha_desde: inicioAnio,
    fecha_hasta: finAnio,
};

export default function Transacciones() {
    //grilla de transacciones (todas: compras, ventas y ajustes)
    const [transacciones, setTransacciones] = useState([]);
    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState({});
    //tipo de transacción con el que se abre el modal (compra|venta|ajuste)
    const [tipoModal, setTipoModal] = useState('');

    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_TRANSACCIONES_INICIALES }));

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [transaccionAccion, setTransaccionAccion] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    // Deriva el tipo de transacción a partir del movimiento (1=compra, 2=venta, 3=ajuste)
    const tipoDe = (t) => TIPO_POR_MOVIMIENTO[Number(t?.id_TipoMovimiento)] || '';

    const openModal = (modo, fila = {}, tipoOverride = '') => {
        setModalMode(modo);
        setTransaccionSeleccionada(fila);
        setTipoModal(tipoOverride || tipoDe(fila));
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las transacciones
    const fetchTransacciones = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const transacciones = await obtenerTransacciones(page, '', '', '', filtros);
            setTransacciones(transacciones.transacciones.data);
            setTotalPaginas(transacciones.transacciones.last_page);
            setTotalRegistros(transacciones.transacciones.total);
            setPaginaActual(transacciones.transacciones.current_page);
            setSubTotal(transacciones.subtotal);
        } catch (error) {
            console.error('Error al cargar las transacciones:', error);
        }
    }, [filtrosAplicados]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchTransacciones(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchTransacciones]);

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    // "Añadir" solo aparece con un tipo filtrado (la creación es por tipo).
    const tipoFiltrado = String(filtrosAplicados?.tipo || '');
    const etiquetaAdd = tipoFiltrado ? `Añadir ${ETIQUETA_TIPO[tipoFiltrado]?.toLowerCase()}` : '';

    // Badge de estado (3=verde, 7=rojo, 1=ámbar)
    const claseEstadoTransaccion = (id) => {
        if (Number(id) === 3) return 'bg-green-100 text-green-700 ring-green-200';
        if (Number(id) === 7) return 'bg-red-100 text-red-700 ring-red-200';
        if (Number(id) === 1) return 'bg-amber-100 text-amber-700 ring-amber-200';
        return 'bg-slate-100 text-slate-600 ring-slate-200';
    };

    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
        setTransaccionAccion(null);
    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    // El modal de "Ver/Continuar/Corregir" se abre con el tipo de la fila.
    const handleVer = (t) => openModal('ver', t);
    const handleContinuar = (t) => openModal('editar', t);
    const handleCorregir = (t) => openModal('corregir', t);

    const handleAdd = () => openModal('crear', {}, tipoFiltrado);

    // Anular (soft): marca estado 7 y revierte stock si estaba posteada.
    const pedirAnular = (t) => {
        setTransaccionAccion({ accion: 'anular', transaccion: t });
        setAccionConfirmadaModal('anular');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(
            Number(t.id_TipoEstado) === 1
                ? `¿Anular la transacción #${t.id}? Quedará anulada y no afectará el stock.`
                : `¿Anular la transacción #${t.id}? Se revertirá el stock de sus productos.`
        );
        setMostrarAlertaModal(true);
    };

    // Eliminar (físico): solo admin y solo si no está enlazada (candados en backend).
    const pedirEliminar = (t) => {
        setTransaccionAccion({ accion: 'eliminar', transaccion: t });
        setAccionConfirmadaModal('eliminar');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Eliminar DEFINITIVAMENTE la transacción #${t.id}? Esta acción no se puede deshacer.`);
        setMostrarAlertaModal(true);
    };

    const confirmarAccion = async () => {
        const accion = transaccionAccion;
        setTransaccionAccion(null);
        if (!accion) return;

        try {
            if (accion.accion === 'anular') {
                const res = await clienteAxios.post(`api/transacciones/${accion.transaccion.id}/anular`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(res.data?.message || 'Transacción anulada correctamente.');
            } else {
                const res = await clienteAxios.delete(`api/transacciones/${accion.transaccion.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(res.data?.message || 'Transacción eliminada definitivamente.');
            }
            fetchTransacciones(paginaActual, filtrosAplicados);
        } catch (error) {
            // El backend explica el candado (posteada, cuotas, comprobante, etc.)
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal(error.response?.data?.message || 'No se pudo completar la acción.');
            setMostrarAlertaModal(true);
        }
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal === 'anular' || accionConfirmadaModal === 'eliminar') {
            confirmarAccion();
        }
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <FiltrosBar
                            title="Transacciones"
                            buttonLabel={etiquetaAdd}
                            onAdd={tipoFiltrado ? handleAdd : undefined}
                            filterDefinitions={FILTROS_TRANSACCIONES}
                            initialValues={FILTROS_TRANSACCIONES_INICIALES}
                            onApply={handleAplicarFiltros}
                        />


                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Nro. Comprobante</th>
                                            <th>Cliente / Proveedor</th>
                                            <th className="text-right">Monto</th>
                                            <th className="text-center">Estado</th>
                                            <th>Motivo</th>
                                            <th className="text-center">Urev</th>
                                            <th className="text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transacciones.length === 0 ? (
                                            <NoExistenDatos colSpan={10} mensaje="No existen transacciones." />
                                        ) : (

                                            transacciones.map((transaccion) => {
                                                const estado = Number(transaccion.id_TipoEstado);
                                                const esBorrador = estado === 1;
                                                return (
                                                <tr key={transaccion.id}>
                                                    <td className="text-center tabular-nums">{transaccion.id}</td>
                                                    <td className="text-center">{transaccion.fecha ? String(transaccion.fecha).slice(0, 10) : '—'}</td>
                                                    <td className="text-center">{transaccion.tipo_movimiento?.nombre || '—'}</td>
                                                    <td className="text-center tabular-nums">{transaccion.nro_comprobante || '—'}</td>
                                                    <td>{transaccion.persona?.nombre || '—'}</td>
                                                    <td className="text-right font-semibold tabular-nums">{formatearGuarani(transaccion.monto)}</td>
                                                    <td className="text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${claseEstadoTransaccion(transaccion.id_TipoEstado)}`}>
                                                            {transaccion.tipo_estado?.descripcion || 'Sin estado'}
                                                        </span>
                                                    </td>
                                                    <td>{transaccion.motivo_ajuste?.nombre || '—'}</td>
                                                    <td className="text-center text-sm">{transaccion.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {/* Ver detalle (solo lectura) */}
                                                            <button type="button" onClick={() => handleVer(transaccion)} title="Ver detalle" className="flex items-center rounded p-1 hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/eye.png" alt="Ver" />
                                                            </button>
                                                            {/* Continuar un borrador (estado Activo) */}
                                                            {esBorrador && (
                                                                <button type="button" onClick={() => handleContinuar(transaccion)} title="Continuar" className="flex items-center rounded p-1 hover:bg-gray-200 focus:outline-none">
                                                                    <img src="/img/Icon/edit.png" alt="Continuar" />
                                                                </button>
                                                            )}
                                                            {/* Corregir cabecera (ni borrador ni anulada) */}
                                                            {estado !== 7 && estado !== 1 && (
                                                                <button type="button" onClick={() => handleCorregir(transaccion)} title="Corregir datos" className="flex items-center rounded p-1 hover:bg-gray-200 focus:outline-none">
                                                                    <img src="/img/Icon/edit.png" alt="Corregir" />
                                                                </button>
                                                            )}
                                                            {/* Anular (oculto si ya está anulada) */}
                                                            {estado !== 7 && (
                                                                <button type="button" onClick={() => pedirAnular(transaccion)} title="Anular" className="flex items-center rounded p-1 hover:bg-gray-200 focus:outline-none">
                                                                    <img src="/img/Icon/rotate.png" alt="Anular" />
                                                                </button>
                                                            )}
                                                            {/* Eliminar físicamente: solo admin y solo borradores */}
                                                            {esBorrador && (
                                                                <button type="button" onClick={() => pedirEliminar(transaccion)} title="Eliminar definitivamente" className="flex items-center rounded p-1 hover:bg-red-100 focus:outline-none">
                                                                    <img src="/img/Icon/trash_bin-remove.png" alt="Eliminar" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                );
                                            })


                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="">
                                <span className="text-lg font-semibold text-gray-700">Total de registros: </span>
                                <span className="text-lg font-bold text-gray-700">{totalRegistros}</span> {/* Aquí el total dinámico */}

                            </div>
                            <div>
                                <span className="text-lg font-semibold text-gray-700">Sub Total: </span>
                                <span className="text-lg font-bold text-gray-700">{formatearGuarani(subTotal)} gs.</span>
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
                    refrescarTransacciones={() => fetchTransacciones(paginaActual, filtrosAplicados)}
                    transaccion={transaccionSeleccionada}
                    modo={modalMode}
                    setModo={setModalMode}
                    onClose={closeModal}
                    tipoTransaccion={tipoModal}
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

