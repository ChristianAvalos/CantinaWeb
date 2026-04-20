import { React, useState, useEffect, useRef } from 'react';
import ModalUsuarios from '../views/ModalUsuarios';
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from '../views/ModalPassword';
import { useTheme } from '../context/ThemeContext';

export default function Header({ onToggleSidebar }) {
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

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      return;
    }

    await document.exitFullscreen?.();
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
      <nav className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200/60 g360-gradient px-4 shadow-md md:px-6">
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15" onClick={onToggleSidebar} aria-label="Alternar menu lateral">
            <i className="fas fa-bars" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15" onClick={toggleFullscreen} aria-label="Pantalla completa">
            <i className="fas fa-expand-arrows-alt" />
          </button>
          <div className="relative">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-semibold transition hover:bg-white/15"
              >
                <span>{user?.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {dropdownOpen && (
                <ul className="absolute right-0 top-14 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-30 transition-all duration-200 ease-in-out">
                  <li className="px-4 pt-3 pb-2">
                    <div className="text-xs font-semibold text-gray-500">Tema</div>
                    <select
                      className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={themeName}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      {Object.entries(themes).map(([key, t]) => (
                        <option key={key} value={key} className="text-slate-700">
                          {t.label}
                        </option>
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
                      onClick={() => {
                        setDropdownOpen(false);
                        openProfileModal('perfil');
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
                    > 
                    <div className='flex items-center'>
                      <img src="/img/Icon/user-man.png" alt="User" className="w-5 h-5 mr-2"  />
                      Mi perfil
                    </div>
                      
                    </button>
                  </li>
                  <li>
                    <button
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
                      onClick={() => {
                        setDropdownOpen(false);
                        setIsModalOpenPassword(true);
                      }}
                    >
                      <div className='flex items-center'>
                        <img src="/img/Icon/key-user-filled.png" alt="Change Password" className="w-5 h-5 mr-2" />
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
                        Cerrar sesión
                      </div>
                      
                    </button>
                  </li>

                </ul>
              )}
            </div>
          </div>
        </div>
      </nav>
      {isModalOpen && (
        <ModalUsuarios
          usuario={user}
          modo={modalMode}
          onClose={closeModal}
          ocultarRolesYOrganizaciones={true}
        />
      )}

      {isModalOpenPassword && (
        <ChangePasswordModal
          isOpen={isModalOpenPassword}
          onClose={() => setIsModalOpenPassword(false)}
        />
      )}
    </div>
  )
}
