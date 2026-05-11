import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import ModalCategoria from "../components/ModalCategoria";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerCategorias } from '../helpers/HelpersUsuarios';
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";

const FILTROS_CATEGORIAS = [
    {
        key: 'search',
        label: 'Buscar categoria',
        type: 'text',
        placeholder: 'Buscar categoria...',
    },
];

const FILTROS_CATEGORIAS_INICIALES = {
    search: '',
};



export default function Categoria() {
    //grilla de categorias 
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionado, setcategoriaSeleccionado] = useState(null);
    //tipo estado del categorias
    const [tipoEstadoSeleccionado, setTipoEstadoSeleccionado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_CATEGORIAS_INICIALES }));

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, categoriaSeleccionado = {}) => {
        setModalMode(modo);
        setcategoriaSeleccionado(categoriaSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las categorias
    const fetchCategorias = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const categorias = await obtenerCategorias(page, filtros.search ?? '');        
            setCategorias(categorias.data);
            setTotalPaginas(categorias.last_page);
            setTotalRegistros(categorias.total);
            setPaginaActual(categorias.current_page);

        } catch (error) {
            console.error('Error al cargar las categorias:', error);
        }
    }, [filtrosAplicados]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchCategorias(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchCategorias]);


    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la eliminacion de categorias seleccionados 
    const handleDelete = async (id) => {

        setCategoriaAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta categoria?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/categorias/${categoriaAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Categoria eliminada correctamente.');
            fetchCategorias();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar la categoria.');
            setMostrarAlertaModal(true);
        } finally {
            setCategoriaAEliminar(null);
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
                            title="Categorías"
                            buttonLabel="Añadir categoria"
                            onAdd={handleAdd}
                            filterDefinitions={FILTROS_CATEGORIAS}
                            initialValues={FILTROS_CATEGORIAS_INICIALES}
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
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categorias.length === 0 ? (
                                            <NoExistenDatos colSpan={3} mensaje="No existen categorías." />
                                        ) : (
                                        categorias.map((categoria) => (
                                            <tr key={categoria.id}>
                                                <td>{categoria.id}</td>
                                                <td>{categoria.nombre}</td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', categoria)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit" />
                                                        </button>
                                                        <button onClick={() => handleDelete(categoria.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
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
                    refrescarCategorias={fetchCategorias}
                    categoria={categoriaSeleccionado}
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

