import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import ModalTransaccion from "../components/ModalTransaccion";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerTransacciones } from '../helpers/HelpersTransacciones.jsx';
import SearchBar from "../components/SearchBar";
import { formatearMiles, formatearGuarani } from '../helpers/HelpersNumeros';
import { formatDateTimeToMinutes, formatDateToInput } from '../helpers/HelpersFechas';
import dayjs from "dayjs";
import NoExistenDatos from "../components/NoExistenDatos";
import MonthPicker from "../components/MonthPicker";

export default function Ajustes() {
    //grilla de los ajustes 
    const [ajustes, setAjustes] = useState([]);
    const [ajusteSeleccionado, setAjusteSeleccionado] = useState(null);

    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    //buscador 
    const [searchTerm, setSearchTerm] = useState('');

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [AjusteAEliminar, setAjusteAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Estado para el mes seleccionado
    const [mesSeleccionado, setMesSeleccionado] = useState(dayjs().format('YYYY-MM'));

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, ajusteSeleccionado = {}) => {
        setModalMode(modo);
        setAjusteSeleccionado(ajusteSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener los ajustes
    //Tipo de movimientos 1=compra 2=venta 3=ajustes
    const fetchAjustes = async (page = 1, search = '', mes = mesSeleccionado,tipo=3) => {
        try {
            const ajustes = await obtenerTransacciones(page, search, mes,tipo);
            setAjustes(ajustes.transacciones.data);
            setTotalPaginas(ajustes.transacciones.last_page);
            setTotalRegistros(ajustes.transacciones.total);
            setPaginaActual(ajustes.transacciones.current_page);
            setSubTotal(ajustes.subtotal ?? ajustes.transacciones?.subtotal ?? 0);
        } catch (error) {
            console.error('Error al cargar los ajustes:', error);
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchAjustes(paginaActual, searchTerm, mesSeleccionado);
    }, [paginaActual, mesSeleccionado]);

    // Maneja el cambio de mes
    const handleMesChange = (valor) => {
        setMesSeleccionado(valor);
        setPaginaActual(1); // Reinicia a la primera página al cambiar de mes
    };

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la eliminacion de ajustes seleccionados 
    const handleDelete = async (id) => {

        setAjusteAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta compra?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/transacciones/${AjusteAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Ajuste eliminado correctamente.');
            fetchAjustes();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar el ajuste.');
            setMostrarAlertaModal(true);
        } finally {
            setAjusteAEliminar(null);
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

    const handleSearch = (term) => {
        setSearchTerm(term);
        // console.log("Buscando:", term); 
        fetchAjustes(1, term, mesSeleccionado);
    };

    const handleAdd = () => {
        openModal('crear')
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <SearchBar
                            title="Ajustes"
                            placeholder="Buscar ajuste..."
                            buttonLabel="Añadir ajuste"
                            onSearch={handleSearch}
                            onAdd={handleAdd}
                        />


                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            {/* Selector de mes */}
                            <MonthPicker value={mesSeleccionado} onChange={handleMesChange} />
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Organización</th>
                                            <th>Nro. Lote</th>
                                            <th>Nro. Comprobante</th>
                                            <th>Tipo</th>
                                            <th>Estado</th>
                                            <th>Nombre</th>
                                            <th>Descripcción</th>
                                            <th>Proveedor</th>
                                            <th>Monto</th>
                                            <th>Urev</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ajustes.length === 0 ? (
                                            <NoExistenDatos colSpan={17} mensaje="No existen ajustes." />
                                        ) : (

                                            ajustes.map((ajuste) => (
                                                <tr key={ajuste.id}>
                                                    <td>{ajuste.id}</td>
                                                    <td className="text-center">{ajuste.organizacion.RazonSocial}</td>
                                                    <td className="text-center">{ajuste.lote}</td>
                                                    <td className="text-center">{ajuste.nro_comprobante}</td>
                                                    <td>{ajuste.tipo_movimiento.nombre}</td>
                                                    <td>{ajuste.tipo_estado.descripcion}</td>
                                                    <td>{ajuste.nombre}</td>
                                                    <td>{ajuste.descripcion}</td>
                                                    <td>{ajuste.persona ? ajuste.persona.nombre : 'Sin proveedor'}</td>
                                                    <td className="text-right">{formatearGuarani(ajuste.monto)}</td>
                                                    <td className="text-center">{ajuste.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex space-x-2">
                                                            <button onClick={() => openModal('editar', ajuste)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/edit.png" alt="Edit" />
                                                            </button>
                                                            <button onClick={() => handleDelete(ajuste.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
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
                    refrescarTransacciones={fetchAjustes}
                    transaccion={ajusteSeleccionado}
                    tipoTransaccion='ajuste'
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

