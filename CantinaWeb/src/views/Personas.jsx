import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import ModalPersona from "../components/ModalPersona";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerPersonas } from '../helpers/HelperPersonas';
import SearchBar from "../components/SearchBar";
import NoExistenDatos from "../components/NoExistenDatos";
import { formatDateTimeToMinutes, formatDateToInput } from '../helpers/HelpersFechas';
import { formatearMiles, formatearGuarani } from '../helpers/HelpersNumeros';



export default function Personas() {
    //grilla de personas 
    const [personas, setPersonas] = useState([]);
    const [personaSeleccionado, setPersonaSeleccionado] = useState(null);
    //tipo estado de la persona
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
    const [personaAEliminar, setPersonaAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, personaSeleccionado = {}) => {
        setModalMode(modo);
        setPersonaSeleccionado(personaSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las personas
    const fetchPersonas = async (page = 1, search = '') => {
        try {
            const personas = await obtenerPersonas(page, search);        
            setPersonas(personas.data);
            setTotalPaginas(personas.last_page);
            setTotalRegistros(personas.total);
            setPaginaActual(personas.current_page);

        } catch (error) {
            console.error('Error al cargar las personas:', error);
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchPersonas(paginaActual);
    }, [paginaActual]);


    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la eliminacion de personas seleccionados 
    const handleDelete = async (id) => {

        setPersonaAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta persona?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/personas/${personaAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Persona eliminada correctamente.');
            fetchPersonas();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar a la persona.');
            setMostrarAlertaModal(true);
        } finally {
            setPersonaAEliminar(null);
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
        //para activar/desactivar personas
        if (accionConfirmadaModal == 'PersonaActive') {
            PersonaActive();
        }

    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        // console.log("Buscando:", term); 
        fetchPersonas(1, term);
    };

    const handleAdd = () => {
        openModal('crear')
    };

    //para activar/desactivar personas
    const handlePersonaActive = async (id, tipoestado) => {
        const accion = tipoestado === '1' ? 'Desactivar' : 'Activar';

        setPersonaSeleccionado(id);
        setTipoEstadoSeleccionado(tipoestado);
        setAccionConfirmadaModal('PersonaActive');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(`¿Estás seguro de que deseas ${accion} a la persona?`);
        setMostrarAlertaModal(true);
    };

    const PersonaActive = async () => {
        try {
            const nuevoEstado = tipoEstadoSeleccionado === 1 ? 2 : 1; // Cambiar el estado
            const accion2 = tipoEstadoSeleccionado === 1 ? 'Desactivado' : 'Activado';


            await clienteAxios.post(`api/persona_estado/${personaSeleccionado}`,
                {
                    id_tipoestado: nuevoEstado
                }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Persona ${accion2} correctamente.`);
            fetchPersonas();
        } catch (error) {
            toast.error('Hubo un problema al cambiar el estado de la persona.');
        } finally {
            setPersonaSeleccionado(null);
        }
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <SearchBar
                            title="Clientes/Proveedores"
                            placeholder="Buscar persona..."
                            buttonLabel="Añadir persona"
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
                                            <th>Documento Nro</th>
                                            <th>Dirección</th>
                                            <th>Telefono</th>
                                            <th>Correo</th>
                                            <th>Tipo de persona</th>
                                            <th>Urev</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {personas.length === 0 ? (
                                            <NoExistenDatos colSpan={10} mensaje="No existen personas." />
                                        ) : (
                                        personas.map((persona) => (
                                            <tr key={persona.id}>
                                                <td>{persona.id}</td>
                                                <td>{persona.nombre}</td>
                                                <td>{formatearMiles(persona.documento)}</td>
                                                <td>{persona.direccion}</td>
                                                <td>{persona.telefono}</td>
                                                <td>{persona.email}</td>
                                                <td className="text-center">{persona.id_tipo_persona ? persona.tipo_persona.nombre : 'Sin movimiento'}</td>
                                                <td>{persona.UrevCalc}</td>
                                                
                                                
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openModal('editar', persona)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit" />
                                                        </button>
                                                        <button onClick={() => handleDelete(persona.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/trash_bin-remove.png" alt="Delete" />
                                                        </button>
                                                        <button onClick={() => handlePersonaActive(persona.id, persona.id_tipoestado)}>
                                                            {persona.id_tipoestado === 1 ? (
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
                <ModalPersona
                    refrescarPersonas={fetchPersonas}
                    persona={personaSeleccionado}
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

