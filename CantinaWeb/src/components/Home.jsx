import { Link } from "react-router-dom"
import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import { obtenerContadoresDashboard } from '../helpers/HelpersUsuarios';
import ModalUsuarios from '../views/ModalUsuarios';
import ModalRol from '../views/ModalRol';
import ModalTransacciones from '../components/ModalTransaccion';
import GraficoGastos from "./GraficosGastos";
import ModalCategoria from "../components/ModalCategoria";


export default function Home() {

  //modal de usuarios 
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('crear');

  //para los tipos de vistas 
  const [isModalVista, setModalVista] = useState('');

  //Cantidad de usuarios registrados
  const [cantidadUsuarios, setCantidadUsuarios] = useState(0);

  //Cantidad de roles registrados
  const [cantidadRoles, setCantidadRoles] = useState(0);

  //Cantidad de transacciones registrados
  const [cantidadTransacciones, setcantidadTransacciones] = useState(0);

  //Cantidad de categorias registrados
  const [cantidadCategrias, setcantidadCategrias] = useState(0);

  const [datosGastos, setDatosGastos] = useState([]);
  const [restante, setRestante] = useState(0);
  const [acumulado, setacumulado] = useState(0);
  const [ingresoMes, setingresoMes] = useState(0);
  const [egresoMes, setegresoMes] = useState(0);


  //para la selección del mes
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  // Cargar todos los contadores desde el endpoint único (igual que Klinix)
  const cargarContadores = async () => {
    try {
      const data = await obtenerContadoresDashboard();
      setCantidadUsuarios(data.usuarios || 0);
      setCantidadRoles(data.roles || 0);
      setcantidadTransacciones(data.transacciones || 0);
      setcantidadCategrias(data.categorias || 0);
    } catch (error) {
      console.error('Error al cargar los contadores:', error);
    }
  };


  //para abrir el modal
  const openModal = (modo, usuarioSeleccionado = {}, vista) => {
    if (vista === 'usuarios') {
      setModalVista('usuarios');
      setModalMode(modo);
      setModalOpen(true);
    }
    if (vista === 'roles') {
      setModalVista('roles');
      setModalMode(modo);
      setModalOpen(true);
    }
    if (vista === 'transacciones') {
      setModalVista('transacciones');
      setModalMode(modo);
      setModalOpen(true);
    }
    if (vista === 'categoria') {
      setModalVista('categoria');
      setModalMode(modo);
      setModalOpen(true);
    }
  };

  //para cerrar el modal
  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    cargarContadores();
  }, []);

  // Función para obtener los datos de gastos desde la API
  const obtenerDatosGastos = async (mes = mesSeleccionado) => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const { data } = await clienteAxios.get('/api/transacciones/grafico', {
        params: { mes }, // Enviar el mes como parámetro
        headers: {
          Authorization: `Bearer ${token}`
        }

      });
      // Ajusta esto según la estructura de tu respuesta
      setDatosGastos(data.gastos);
      setRestante(data.restante);
      setacumulado(data.acumulado);
      setingresoMes(data.ingresoMes);
      setegresoMes(data.egresoMes);
    } catch (error) {
      console.error('Error al cargar los datos de gastos:', error);
    }
  };

  useEffect(() => {
    obtenerDatosGastos(mesSeleccionado);
  }, [mesSeleccionado]);

  const handleMesChange = (e) => {
    setMesSeleccionado(e.target.value);
  };


  return (
    <>
      {/* Encabezado */}
      <div className="py-4 px-6 bg-white border-b">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <nav className="text-sm text-gray-500 flex items-center space-x-2">
            <Link to="/" className="hover:underline">Principal</Link>
            <span>/</span>
            <span className="text-gray-700">Panel de control</span>
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <section className="p-6 bg-gray-50 min-h-[calc(100vh-120px)]">
        <div className="max-w-7xl mx-auto">
          {/* Cajas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-sky-500 rounded-lg shadow-md p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-white text-3xl font-bold">{cantidadCategrias}</h3>
                <p className="text-white text-lg">Categorías</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => openModal('crear', {}, 'categoria')}>
                  <i className="fas fa-list text-white text-2xl" />
                </button>
                <Link to="/categorias" className="text-white text-sm underline hover:text-sky-200">Más información</Link>
              </div>
            </div>
            <div className="bg-green-500 rounded-lg shadow-md p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-white text-3xl font-bold">{cantidadTransacciones}</h3>
                <p className="text-white text-lg">Transacciones</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => openModal('crear', {}, 'transacciones')}>
                  <i className="ion ion-stats-bars text-white text-2xl" />
                </button>
                <Link to="/transacciones" className="text-white text-sm underline hover:text-green-200">Más información</Link>
              </div>
            </div>
            <div className="bg-yellow-400 rounded-lg shadow-md p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-white text-3xl font-bold">{cantidadUsuarios}</h3>
                <p className="text-white text-lg">Usuarios registrados</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => openModal('crear', {}, 'usuarios')}>
                  <i className="ion ion-person-add text-white text-2xl" />
                </button>
                <Link to="/usuarios" className="text-white text-sm underline hover:text-yellow-100">Más información</Link>
              </div>
            </div>

            <div className="bg-red-500 rounded-lg shadow-md p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-white text-3xl font-bold">{cantidadRoles}</h3>
                <p className="text-white text-lg">Roles</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => openModal('crear', {}, 'roles')}>
                  <i className="ion ion-android-lock text-white text-2xl" />
                </button>
                <Link to="/usuarios/roles" className="text-white text-sm underline hover:text-red-200">Más información</Link>
              </div>
            </div>
          </div>

          {/* Gráfico de gastos */}
          <div className="mt-8">
            <GraficoGastos
              datos={datosGastos}
              restante={restante}
              acumulado={acumulado}
              ingresoMes={ingresoMes}
              egresoMes={egresoMes}
              mesSeleccionado={mesSeleccionado}
              handleMesChange={handleMesChange}
            />
          </div>
        </div>
      </section>

      {/* Modales */}
      {isModalOpen && isModalVista === 'usuarios' && (
        <ModalUsuarios
          refrescarUsuarios={cargarContadores}
          modo={modalMode}
          onClose={closeModal}
        />
      )}
      {isModalOpen && isModalVista === 'roles' && (
        <ModalRol
          refrescarRoles={cargarContadores}
          modo={modalMode}
          onClose={closeModal}
        />
      )}
      {isModalOpen && isModalVista === 'transacciones' && (
        <ModalTransacciones
          refrescarTransacciones={cargarContadores}
          refrescarGastos={obtenerDatosGastos}
          modo={modalMode}
          onClose={closeModal}
        />
      )}
      {isModalOpen && isModalVista === 'categoria' && (
        <ModalCategoria
          refrescarCategorias={cargarContadores}
          modo={modalMode}
          onClose={closeModal}
        />
      )}
    </>
  )
}
