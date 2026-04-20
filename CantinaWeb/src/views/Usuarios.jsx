import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import ModalUsuarios from './ModalUsuarios';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerUsuarios } from '../helpers/HelpersUsuarios';
import SearchBar from "../components/SearchBar";
import NoExistenDatos from '../components/NoExistenDatos';



export default function Usuarios() {
    //grilla de usuarios 
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    //tipo estado del usuario
    const [tipoEstadoSeleccionado, setTipoEstadoSeleccionado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    //buscador 
    const [searchTerm, setSearchTerm] = useState('');

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, usuarioSeleccionado = {}) => {
        setModalMode(modo);
        setUsuarioSeleccionado(usuarioSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener los usuarios
    const fetchUsuarios = async (page = 1, search = '') => {
        try {
            const usuarios = await obtenerUsuarios(page, search);
            setUsuarios(usuarios.usuarios.data);
            setTotalPaginas(usuarios.usuarios.last_page);
            setTotalRegistros(usuarios.usuarios.total);
            const currentPage = Number(usuarios.usuarios.current_page ?? page);
            if (Number.isFinite(currentPage)) {
                setPaginaActual(currentPage);
            }

        } catch (error) {
            console.error('Error al cargar los usuarios:', error);
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchUsuarios(paginaActual);
    }, [paginaActual]);


    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la eliminacion de usuarios seleccionados 
    const handleDelete = async (id) => {

        setUsuarioAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar este usuario?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/usuario/${usuarioAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Usuario eliminado correctamente.');
            
            fetchUsuarios();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar el usuario.');
            setMostrarAlertaModal(true);
        } finally {
            setUsuarioAEliminar(null);
        }
    }

    //para resetear contraseña de usuario
    const handleResetPassword = async (id) => {

        setUsuarioSeleccionado(id);
        setAccionConfirmadaModal('resetPassword');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas restablecer la contraseña?');
        setMostrarAlertaModal(true);
    };

    const resetPassword = async () => {
        try {
            await clienteAxios.post(`api/usuario/${usuarioSeleccionado}/reset-password`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Contraseña restablecida correctamente.');
            fetchUsuarios();
        } catch (error) {
            toast.error('Hubo un problema al restablecer la contraseña.');
        } finally {
            setUsuarioSeleccionado(null);
        }
    };



    //para activar/desactivar usuario
    const handleUserActive = async (id, tipoestado) => {
        const accion = tipoestado === 1 ? 'Desactivar' : 'Activar';

        setUsuarioSeleccionado(id);
        setTipoEstadoSeleccionado(tipoestado);
        setAccionConfirmadaModal('UserActive');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Estás seguro de que deseas ${accion} al usuario?`);
        setMostrarAlertaModal(true);
    };

    const UserActive = async () => {
        try {
            const nuevoEstado = tipoEstadoSeleccionado === 1 ? 2 : 1; // Cambiar el estado
            const accion2 = tipoEstadoSeleccionado === 1 ? 'Desactivado' : 'Activado';


            await clienteAxios.post(`api/usuario_estado/${usuarioSeleccionado}`,
                {
                    id_tipoestado: nuevoEstado
                }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Usuario ${accion2} correctamente.`);
            fetchUsuarios();
        } catch (error) {
            toast.error('Hubo un problema al cambiar el estado del usuario.');
        } finally {
            setUsuarioSeleccionado(null);
        }
    };



    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal == 'delete') {
            confirmarEliminacion();
        }

        if (accionConfirmadaModal == 'resetPassword') {
            resetPassword();
        }

        if (accionConfirmadaModal == 'UserActive') {
            UserActive();
        }

    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        // console.log("Buscando:", term); // Reemplaza con tu lógica de búsqueda
        fetchUsuarios(1, term);
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
                            title="Usuarios"
                            placeholder="Buscar usuarios..."
                            buttonLabel="Añadir usuarios"
                            onSearch={handleSearch}
                            onAdd={handleAdd}
                        />
                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            <div className="overflow-x-auto">
                               <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Nombre del Usuario</th>
                                            <th>Correo</th>
                                            <th>Rol</th>
                                            <th>Organización</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.length === 0 ? (
                                            <NoExistenDatos colSpan={6} mensaje="No existen usuarios registrados." />
                                        ) : (
                                        usuarios.map((usuario) => (
                                            <tr key={usuario.id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                                                <td>{usuario.id}</td>
                                                <td>
                                                    <span className="block max-w-[220px] truncate" title={usuario.name || ''}>
                                                        {usuario.name}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="block max-w-[220px] truncate" title={usuario.nameUser || ''}>
                                                        {usuario.nameUser}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="block max-w-[260px] truncate" title={usuario.email || ''}>
                                                        {usuario.email}
                                                    </span>
                                                </td>
                                                <td>{usuario.role ? usuario.role.name : 'Sin rol'}</td>
                                                <td>
                                                    <span className="block max-w-[260px] truncate" title={usuario.organizacion?.RazonSocial || ''}>
                                                        {usuario.organizacion ? usuario.organizacion.RazonSocial : 'Sin organización'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', usuario)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit User" />
                                                        </button>
                                                        <button onClick={() => handleDelete(usuario.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/trash_bin-remove.png" alt="Delete User" />
                                                        </button>
                                                        <button onClick={() => handleResetPassword(usuario.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/rotate.png" alt="Reset password" />
                                                        </button>

                                                        <button onClick={() => handleUserActive(usuario.id, usuario.id_tipoestado)}>
                                                            {usuario.id_tipoestado === 1 ? (
                                                                <img src="/img/Icon/toggle-on.png" alt="Edit User" className="w-5 h-5 mr-2" />
                                                                // <i className="fas fa-toggle-on"></i>
                                                            ) : (
                                                                <img src="/img/Icon/toggle-off.png" alt="Edit User" className="w-5 h-5 mr-2" />
                                                                // <i className="fas fa-toggle-off"></i>
                                                            )}
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
                <ModalUsuarios
                    refrescarUsuarios={fetchUsuarios}
                    usuario={usuarioSeleccionado}
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

