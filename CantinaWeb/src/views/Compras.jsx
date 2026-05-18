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

const inicioMesActual = dayjs().startOf('month').format('YYYY-MM-DD');
const finMesActual = dayjs().endOf('month').format('YYYY-MM-DD');

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
    const [compraAEliminar, setCompraAEliminar] = useState(null);

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

    //para la eliminacion de compras seleccionados 
    const handleDelete = async (id) => {

        setCompraAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta compra?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            await clienteAxios.delete(`api/transacciones/${compraAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Compra eliminada correctamente.');
            fetchCompras();
        } catch {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar la compra.');
            setMostrarAlertaModal(true);
        } finally {
            setCompraAEliminar(null);
        }
    }


    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal == 'delete') {
            confirmarEliminacion();
        }

    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    const handleAdd = () => {
        openModal('crear')
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
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Organización</th>
                                            <th>Nro. Comprobante</th>
                                            <th>Nombre</th>
                                            <th>Descripcción</th>
                                            <th>Proveedor</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th>Urev</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compras.length === 0 ? (
                                            <NoExistenDatos colSpan={17} mensaje="No existen compras." />
                                        ) : (

                                            compras.map((compra) => (
                                                <tr key={compra.id}>
                                                    <td>{compra.id}</td>
                                                    <td className="text-center">{compra.organizacion.RazonSocial}</td>
                                                    <td className="text-center">{compra.nro_comprobante}</td>
                                                    <td>{compra.nombre}</td>
                                                    <td>{compra.descripcion}</td>
                                                    <td>{compra.persona ? compra.persona.nombre : 'Sin proveedor'}</td>
                                                    <td className="text-right">{formatearGuarani(compra.monto)}</td>
                                                    <td>{compra.tipo_estado.descripcion}</td>
                                                    <td className="text-center">{compra.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex space-x-2">
                                                            <button onClick={() => openModal('editar', compra)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/edit.png" alt="Edit" />
                                                            </button>
                                                            <button onClick={() => handleDelete(compra.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/trash_bin-remove.png" alt="Delete User" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))


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

