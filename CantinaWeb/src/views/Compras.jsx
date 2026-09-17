import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import ModalTransaccion from "../components/ModalTransaccion";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerTransacciones } from '../helpers/HelpersTransacciones.jsx';
import { formatearGuarani } from '../helpers/HelpersNumeros';
import dayjs from "dayjs";
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";

const FILTROS_COMPRAS = [
    {
        key: 'search',
        label: 'Buscar compra',
        type: 'text',
        placeholder: 'Buscar compra (nombre,descripción,proveedor,monto...)',
    },
    {
        key: 'nro_comprobante',
        label: 'Número de comprobante',
        type: 'text',
        placeholder: 'Número de comprobante...',
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

const FILTROS_COMPRAS_INICIALES = {
    search: '',
    fecha_desde: inicioMesActual,
    fecha_hasta: finMesActual,
};

export default function Compras() {
    //grilla de las compras 
    const [compras, setCompras] = useState([]);
    const [compraSeleccionado, setCompraSeleccionado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_COMPRAS_INICIALES }));

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [compraAAnular, setCompraAAnular] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, compraseleccionado = {}) => {
        setModalMode(modo);
        setCompraSeleccionado(compraseleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las compras
    //Tipo de movimientos 1=compra 2=venta 3=ajustes
    const fetchCompras = useCallback(async (page = 1, filtros = filtrosAplicados, tipo = 1) => {
        try {
            const compras = await obtenerTransacciones(page, '', '', tipo, filtros);
            setCompras(compras.transacciones.data);
            setTotalPaginas(compras.transacciones.last_page);
            setTotalRegistros(compras.transacciones.total);
            setPaginaActual(compras.transacciones.current_page);
            setSubTotal(compras.subtotal ?? compras.transacciones?.subtotal ?? 0);
        } catch (error) {
            console.error('Error al cargar las compras:', error);
        }
    }, [filtrosAplicados]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchCompras(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchCompras]);

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la anulacion de compras (estilo SAP: no se borra, se anula)
    const handleAnular = (compra) => {
        setCompraAAnular(compra);
        setAccionConfirmadaModal('anular');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Estás seguro de que deseas anular la compra #${compra.id}? Se revertirá el stock de los productos.`);
        setMostrarAlertaModal(true);
    };

    const confirmarAnulacion = async () => {
        try {
            const response = await clienteAxios.post(`api/transacciones/${compraAAnular.id}/anular`, {}, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success(response.data?.message || 'Compra anulada correctamente.');
            fetchCompras();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal(error.response?.data?.message || 'Hubo un problema al anular la compra.');
            setMostrarAlertaModal(true);
        } finally {
            setCompraAAnular(null);
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

    const handleVer = (compra) => {
        openModal('ver', compra);
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
                            title="Compras"
                            buttonLabel="Añadir compra"
                            onAdd={handleAdd}
                            filterDefinitions={FILTROS_COMPRAS}
                            initialValues={FILTROS_COMPRAS_INICIALES}
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
                                            <th>Proveedor</th>
                                            <th className="text-right">Monto</th>
                                            <th className="text-center">Estado</th>
                                            <th className="text-right">Urev</th>
                                            <th className="text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compras.length === 0 ? (
                                            <NoExistenDatos colSpan={10} mensaje="No existen compras." />
                                        ) : (

                                            compras.map((compra) => (
                                                <tr key={compra.id}>
                                                    <td className="text-center tabular-nums">{compra.id}</td>
                                                    <td>{compra.organizacion?.RazonSocial || 'Sin organización'}</td>
                                                    <td className="text-center tabular-nums">{compra.nro_comprobante}</td>
                                                    <td className="font-medium text-slate-800">{compra.nombre}</td>
                                                    <td className="text-slate-600">{compra.descripcion}</td>
                                                    <td>{compra.persona ? compra.persona.nombre : 'Sin proveedor'}</td>
                                                    <td className="text-right font-semibold tabular-nums">{formatearGuarani(compra.monto)}</td>
                                                    <td className="text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${claseEstadoTransaccion(compra.id_TipoEstado)}`}>
                                                            {compra.tipo_estado?.descripcion || 'Sin estado'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right tabular-nums">{compra.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {/* Ver detalle (solo lectura) */}
                                                            <button onClick={() => handleVer(compra)} title="Ver detalle" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                <img src="/img/Icon/eye.png" alt="Ver" />
                                                            </button>
                                                            {/* Corregir cabecera (oculto si ya está anulada) */}
                                                            {Number(compra.id_TipoEstado) !== 7 && (
                                                                <button onClick={() => openModal('corregir', compra)} title="Corregir datos" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
                                                                    <img src="/img/Icon/edit.png" alt="Corregir" />
                                                                </button>
                                                            )}
                                                            {/* Anular (oculto si ya está anulada) */}
                                                            {Number(compra.id_TipoEstado) !== 7 && (
                                                                <button onClick={() => handleAnular(compra)} title="Anular compra" className="flex items-center rounded hover:bg-gray-200 focus:outline-none p-1">
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
                    refrescarTransacciones={fetchCompras}
                    transaccion={compraSeleccionado}
                    tipoTransaccion='compra'
                    modo={modalMode}
                    onClose={closeModal}
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

