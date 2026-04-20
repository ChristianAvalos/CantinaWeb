import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import ModalRol from './ModalRol';
import ModalRolPermisos from './ModalRolPermisos';
import SearchBar from "../components/SearchBar";
import { obtenerRoles } from '../helpers/HelpersUsuarios';
import NoExistenDatos from "../components/NoExistenDatos";


export default function Roles() {
    //grilla de roles
    const [roles, setRoles] = useState([]);
    const [rolSeleccionado, setrolSeleccionado] = useState(null);

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [rolAEliminar, setRolAEliminar] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    //buscador 
    const [searchTerm, setSearchTerm] = useState('');
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    //funcion para obtener los roles
    const fetchRoles = async (page = 1, search = '') => {
        try {

            // Realizar la solicitud a la API
            const data = await obtenerRoles(page, search);
            // Actualizar el estado con los usuarios obtenidos
            setRoles(data.data);
            setTotalPaginas(data.last_page);
            setTotalRegistros(data.total);
            setPaginaActual(data.current_page);

        } catch (error) {
            console.error('Error al obtener los roles:', error);
            throw error; // Lanza el error para manejarlo donde sea llamado
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchRoles(paginaActual);
    }, [paginaActual]);




    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [isModalOpenRolePermissions, setModalOpenRolePermissions] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    const openModal = (modo, rolSeleccionado = {}) => {
        setModalMode(modo);
        setrolSeleccionado(rolSeleccionado);
        setModalOpen(true);
    };

    const openModalRolePermissions = (id) => {
        setrolSeleccionado(id);
        setModalOpenRolePermissions(true);

    };


    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
        setModalOpenRolePermissions(false);
    };



    //para la eliminacion de roles seleccionados 
    const handleDelete = async (id) => {

        setRolAEliminar(id);
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar este usuario?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/roles/${rolAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Rol eliminado correctamente.');
            fetchRoles();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar el rol.');
            setMostrarAlertaModal(true);
        } finally {
            setRolAEliminar(null);
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
        fetchRoles(1, term);
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
                            title="Roles"
                            placeholder="Buscar roles..."
                            buttonLabel="Añadir rol"
                            onSearch={handleSearch}
                            onAdd={handleAdd}
                        />
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Rol</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.length === 0 ? (
                                            <NoExistenDatos colSpan={3} mensaje="No existen roles." />  
                                        ) : (
                                        roles.map((roles) => (
                                            <tr key={roles.id}>
                                                <td>{roles.id}</td>
                                                <td>{roles.name}</td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', roles)} className="flex items-center focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit Rol" />
                                                        </button>
                                                        <button onClick={() => openModalRolePermissions(roles.id)} className="flex items-center focus:outline-none">
                                                            <img src="/img/Icon/planning-user.png" alt="Rol permisos" />
                                                        </button>
                                                        <button onClick={() => handleDelete(roles.id)} className="flex items-center focus:outline-none">
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
                <ModalRol
                    rol={rolSeleccionado}
                    refrescarRoles={fetchRoles}
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

            {isModalOpenRolePermissions && (
                <ModalRolPermisos
                    roleId={rolSeleccionado}
                    onClose={closeModal}
                    refrescarRoles={fetchRoles}
                />
            )}

        </div>
    );
}

