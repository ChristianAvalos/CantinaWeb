import { React, useState,useEffect, useRef }from 'react';
import ModalUsuarios from '../views/ModalUsuarios';
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from '../views/ModalPassword';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { logout, user } = useAuth({ middleware: 'auth' })
  const { themes, themeName, setTheme, resetTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    logout();
    setDropdownOpen(false);  // Cerrar el menú después de hacer logout
  };

  //para cuando se toca fuera del boton el menu desplegable 
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  const handleClickOutside = (event) => {
    // Verifica si el clic fue fuera del dropdown
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    // Agrega el evento de clic en el documento
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpia el evento al desmontar el componente
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  //apertura de modal de password
  const [isModalOpenPassword, setIsModalOpenPassword] = useState(false);

  // Apertura del modal en modo "perfil"
  const [modalMode, setModalMode] = useState('perfil');
  const [isModalOpen, setModalOpen] = useState(false);
  const openProfileModal = (modo) => {
    setModalMode(modo);
    setModalOpen(true);
  };

  // Cierre del modal
  const closeModal = () => {
    setModalOpen(false);
  };


  return (
    <div>
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand g360-gradient !z-[1]">
        {/* Left navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars" /></a>
          </li>
        </ul>
        {/* Right navbar links */}
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <a className="nav-link" data-widget="fullscreen" href="#" role="button">
              <i className="fas fa-expand-arrows-alt" />
            </a>
          </li>
          <li className="nav-item">
            {/* Usuario logueado y menú desplegable */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="nav-link font-semibold focus:outline-none flex items-center space-x-2"
              >
                {user?.name} {/* Muestra el nombre del usuario */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {/* Menú desplegable */}
              {dropdownOpen && (
                <ul className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 transition-all duration-200 ease-in-out border border-gray-200">
                  <li className="px-4 pt-3 pb-2">
                    <div className="text-xs font-semibold text-gray-500">Tema</div>
                    <select
                      className="mt-2 w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={themeName}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      {Object.entries(themes).map(([key, t]) => (
                        <option key={key} value={key}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={resetTheme}
                      className="mt-2 w-full rounded-md bg-gray-100 px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      Restaurar por defecto
                    </button>
                  </li>
                  <li><hr className="my-1 border-gray-200" /></li>
                  <li>
                    <button
                      onClick={() => openProfileModal('perfil')}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
                    > 
                    <div className='flex items-center'>
                      <img src="/img/Icon/user-man.png" alt="User" className="w-5 h-5 mr-2"  />
                      {/* <i className="fas fa-user mr-2"></i> */}
                      Mi perfil
                    </div>
                      
                    </button>
                  </li>
                  <li>
                    <button
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
                      onClick={() => setIsModalOpenPassword(true)}
                    >
                      <div className='flex items-center'>
                        <img src="/img/Icon/key-user-filled.png" alt="Change Password" className="w-5 h-5 mr-2" />
                        {/* <i className="fas fa-key mr-2"></i> */}
                        Cambiar contraseña
                      </div>
                      
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
                    >
                      <div className='flex items-center'>
                        <img src="/img/Icon/exit.png" alt="Logout" className="w-5 h-5 mr-2" />
                        {/* <i className="fas fa-sign-out-alt mr-2"></i> */}
                        Cerrar sesión
                      </div>
                      
                    </button>
                  </li>

                </ul>
              )}
            </div>
          </li>


        </ul>
      </nav>
      {/* Renderizar el modal usuario */}
      {isModalOpen && (
        <ModalUsuarios
          usuario={user}
          modo={modalMode}
          onClose={closeModal}
          ocultarRolesYOrganizaciones={true}
        />
      )}

      {/* Renderizar el modal de cambio de contraseña */}
      {isModalOpenPassword && (
        <ChangePasswordModal
          isOpen={isModalOpenPassword}
          onClose={() => setIsModalOpenPassword(false)}
        />
      )}
    </div>
  )
}
