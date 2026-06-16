import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import ModalCategoria from "../components/ModalCategoria";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";
import { formatearGuarani } from '../helpers/HelpersNumeros';


const FILTROS_PrecioVenta = [
    {
        key: 'search',
        label: 'Buscar precio de venta',
        type: 'text',
        placeholder: 'Buscar precio de venta...',
    },
    {
        key: 'nombre',
        label: 'Nombre del producto',
        type: 'text',
        placeholder: 'Buscar por nombre del producto...',
    },
];

const FILTROS_PrecioVenta_INICIALES = {
    search: '',
};



export default function PrecioVenta() {
    //grilla de precios de venta
    const [preciosVenta, setPreciosVenta] = useState([]);
    const [precioVentaSeleccionado, setPrecioVentaSeleccionado] = useState(null);
    //tipo estado del precio de venta
    const [tipoEstadoSeleccionado, setTipoEstadoSeleccionado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_PrecioVenta_INICIALES }));

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [precioVentaAEliminar, setPrecioVentaAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, precioVentaSeleccionado = {}) => {
        setModalMode(modo);
        setPrecioVentaSeleccionado(precioVentaSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener los precios de venta
    const fetchPreciosVenta = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const preciosVenta = await obtenerPreciosVenta(page, filtros.search ?? '');        
            setPreciosVenta(preciosVenta.data);
            setTotalPaginas(preciosVenta.last_page);
            setTotalRegistros(preciosVenta.total);
            setPaginaActual(preciosVenta.current_page);

        } catch (error) {
            console.error('Error al cargar los precios de venta:', error);
        }
    }, [filtrosAplicados]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchPreciosVenta(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchPreciosVenta]);


    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };


    const obtenerPreciosVenta = async (page = 1, search = '') => {
        const token = localStorage.getItem('AUTH_TOKEN');
        const { data } = await clienteAxios.get(`api/precio_venta?page=${page}&search=${search}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return data;
    };

    //para la eliminacion de precios de venta seleccionados 
    const handleDelete = async (id) => {

        setPrecioVentaAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar este precio de venta?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/precio_venta/${precioVentaAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Precio de venta eliminado correctamente.');
            fetchPreciosVenta();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar el precio de venta.');
            setMostrarAlertaModal(true);
        } finally {
            setPrecioVentaAEliminar(null);
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

    const handleAdd = () => {
        openModal('crear')
    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <FiltrosBar
                            title="Precios de Venta"
                            buttonLabel="Añadir precio de venta"
                            onAdd={handleAdd}
                            filterDefinitions={FILTROS_PrecioVenta}
                            initialValues={FILTROS_PrecioVenta_INICIALES}
                            onApply={handleAplicarFiltros}
                        />

                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Organización</th>
                                            <th>Tipo de moneda</th>
                                            <th>Precio</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preciosVenta.length === 0 ? (
                                            <NoExistenDatos colSpan={6} mensaje="No existen precios de venta." />
                                        ) : (
                                        preciosVenta.map((precioVenta) => (
                                            <tr key={precioVenta.id}>
                                                <td>{precioVenta.id}</td>
                                                <td>{precioVenta.producto.nombre}</td>
                                                <td>{precioVenta.organizacion.RazonSocial}</td>
                                                <td>{precioVenta.tipo_moneda.nombre}</td>
                                                <td>{formatearGuarani(precioVenta.precio)}</td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', precioVenta)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit" />
                                                        </button>
                                                        <button onClick={() => handleDelete(precioVenta.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/trash_bin-remove.png" alt="Delete" />
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
                                <span className="text-lg font-semibold text-gray-700">Total de registros:</span>
                                <span className="text-lg font-bold text-gray-700">{totalRegistros}</span> {/* Aquí el total dinámico */}
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
                <ModalCategoria
                    refrescarCategorias={fetchPreciosVenta}
                    categoria={precioVentaSeleccionado}
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

