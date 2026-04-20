import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";
import ModalOrganizacion from "./ModalOrganizacion";
import SearchBar from "../components/SearchBar";
import NoExistenDatos from "../components/NoExistenDatos";


export default function Organizacion() {
    //grilla de organizacion
    const [organizacion, setOrganizacion,] = useState([]);
    const [organizacionSeleccionado, setorganizacionSeleccionado] = useState(null);

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [organizacionAEliminar, setOrganizacionAEliminar] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    //buscador 
    const [searchTerm, setSearchTerm] = useState('');
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    //funcion para obtener las organizaciones
    const fetchOrganizacion = async (page = 1, search = '') => {
        try {

            // Realizar la solicitud a la API
            const { data } = await clienteAxios.get(`api/organizacion?page=${page}&search=${search}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            // Actualizar el estado con los usuarios obtenidos
            setOrganizacion(data.data);
            setTotalPaginas(data.last_page);
            setTotalRegistros(data.total);
            setPaginaActual(data.current_page);

        } catch (error) {
            console.error('Error al obtener las organizaciones:', error);
            throw error; // Lanza el error para manejarlo donde sea llamado
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchOrganizacion(paginaActual);
    }, [paginaActual]);




    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    const openModal = (modo, organizacionSeleccionado = {}) => {
        setModalMode(modo);
        setorganizacionSeleccionado(organizacionSeleccionado);
        setModalOpen(true);
    };


    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };



    //para la eliminacion de organizacion
    const handleDelete = async (id) => {

        setOrganizacionAEliminar(id);
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar este usuario?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/organizacion/${organizacionAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Organización eliminado correctamente.');
            fetchOrganizacion();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar la organización.');
            setMostrarAlertaModal(true);
        } finally {
            setOrganizacionAEliminar(null);
        }
    }



    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        confirmarEliminacion();
    };


    const handleSearch = (term) => {
        setSearchTerm(term);
       // console.log("Buscando:", term); // Reemplaza con tu lógica de búsqueda
        fetchOrganizacion(1, term);
    };

    const handleAdd = () => {
        openModal('crear')// Reemplaza con tu lógica para agregar
    };




    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <SearchBar
                            title="Organización"
                            placeholder="Buscar organización..."
                            buttonLabel="Añadir organización"
                            onSearch={handleSearch}
                            onAdd={handleAdd}
                        />
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Razón social</th>
                                            <th>RUC</th>
                                            <th>Dirección</th>
                                            <th>Ciudad</th>
                                            <th>Pais</th>
                                            <th>Telefono(s)</th>
                                            <th>Fax(s)</th>
                                            <th>Email</th>
                                            <th>Sigla</th>
                                            <th>Sitio web</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {organizacion.length === 0 ? (
                                            <NoExistenDatos colSpan={12} mensaje="No existen organizaciones registradas." />    
                                        ) : (
                                        organizacion.map((organizacion) => (
                                            <tr key={organizacion.id}>
                                                <td>{organizacion.id}</td>
                                                <td>{organizacion.RazonSocial}</td>
                                                <td>{organizacion.RUC}</td>
                                                <td>{organizacion.Direccion}</td>
                                                <td>{organizacion.ciudad ? organizacion.ciudad.nombre : 'Sin ciudad seleccionada'}</td>
                                                <td>{organizacion.pais ? organizacion.pais.Name : 'Sin pais seleccionado'}</td>
                                                <td>{organizacion.Telefono}</td>
                                                <td>{organizacion.Fax}</td>
                                                <td>{organizacion.Email}</td>
                                                <td>{organizacion.Sigla}</td>
                                                <td>{organizacion.SitioWeb}</td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', organizacion)} className="flex items-center focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit Rol" />
                                                        </button>
                                                        <button onClick={() => handleDelete(organizacion.id)} className="flex items-center focus:outline-none">
                                                            <img src="/img/Icon/trash_bin-remove.png" alt="Delete Rol" />
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
                <ModalOrganizacion
                    organizacion={organizacionSeleccionado}
                    refrescarOrganizacion={fetchOrganizacion}
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
    )
}
