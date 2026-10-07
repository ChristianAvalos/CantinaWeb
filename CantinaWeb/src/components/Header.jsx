import { React, useState, useEffect, useRef } from 'react';
import ModalUsuarios from '../views/ModalUsuarios';
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from '../views/ModalPassword';
import { useTheme } from '../context/ThemeContext';
import { PALETA_COLORES, tripletaAHex } from '../helpers/coloresIconos';

export default function Header({ onToggleSidebar }) {
  const { logout, user, mutate } = useAuth({ middleware: 'auth' })
  const {
    themes,
    theme,
    themeName,
    setTheme,
    resetTheme,
    colorPanel,
    setColorPanel,
    modoIconos,
    colorIconos,
    setModoIconos,
    setColorIconos,
  } = useTheme();
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
                <span>{ user?.name.toUpperCase() }</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {dropdownOpen && (
                <ul className="absolute right-0 top-14 w-72 max-h-[75vh] overflow-y-auto scroll-sutil rounded-lg border border-gray-200 bg-white shadow-lg z-30 transition-all duration-200 ease-in-out">
                  <li className="px-4 pt-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-500">Colores de paneles o fondo</div>
                      {colorPanel && (
                        <button
                          type="button"
                          onClick={resetTheme}
                          className="text-[0.68rem] font-semibold text-blue-600 hover:underline"
                        >
                          Por defecto
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(themes).map(([key, t]) => {
                        const activo = !colorPanel && themeName === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            title={t.label}
                            aria-label={t.label}
                            aria-pressed={activo}
                            onClick={() => setTheme(key)}
                            className={`h-6 w-6 rounded-full border transition ${activo ? 'border-slate-700 ring-2 ring-slate-300' : 'border-black/10 hover:scale-110'}`}
                            style={{ backgroundImage: `linear-gradient(135deg, rgb(${t.from}), rgb(${t.to}))` }}
                          />
                        );
                      })}
                      <label
                        title="Otro color de fondo"
                        className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-500 hover:bg-gray-100"
                      >
                        <i className="fas fa-plus text-[0.6rem]" />
                        <input
                          type="color"
                          value={colorPanel || tripletaAHex(theme.from) || '#1e3a8a'}
                          onChange={(e) => setColorPanel(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span className="sr-only">Elegir otro color de fondo</span>
                      </label>
                    </div>
                    <p className="mt-2 text-[0.68rem] leading-snug text-gray-500">
                      El texto y los íconos se adaptan solos al fondo.
                    </p>
                  </li>

                  {/* Paleta de colores de los íconos del panel lateral */}
                  <li className="px-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-500">Color de los íconos</div>
                      {modoIconos !== 'modulo' && (
                        <button
                          type="button"
                          onClick={() => setModoIconos('modulo')}
                          className="text-[0.68rem] font-semibold text-blue-600 hover:underline"
                        >
                          Por módulo
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PALETA_COLORES.map((color) => {
                        const activo = modoIconos !== 'modulo'
                          && colorIconos.toLowerCase() === color.valor.toLowerCase();
                        return (
                          <button
                            key={color.valor}
                            type="button"
                            title={color.nombre}
                            aria-label={color.nombre}
                            aria-pressed={activo}
                            onClick={() => {
                              setColorIconos(color.valor);
                              setModoIconos('personalizado');
                            }}
                            className={`h-6 w-6 rounded-full border transition ${activo ? 'border-slate-700 ring-2 ring-slate-300' : 'border-black/10 hover:scale-110'}`}
                            style={{ backgroundColor: color.valor }}
                          />
                        );
                      })}
                      <label
                        title="Otro color"
                        className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-500 hover:bg-gray-100"
                      >
                        <i className="fas fa-plus text-[0.6rem]" />
                        <input
                          type="color"
                          value={colorIconos}
                          onChange={(e) => {
                            setColorIconos(e.target.value);
                            setModoIconos('personalizado');
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span className="sr-only">Elegir otro color</span>
                      </label>
                    </div>
                    <p className="mt-2 text-[0.68rem] leading-snug text-gray-500">
                      {modoIconos === 'modulo'
                        ? 'Cada módulo usa su color.'
                        : 'El color se aclara u oscurece solo según el tema.'}
                    </p>
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
                      <i className="fas fa-user w-5 h-5 mr-2 text-[1.15rem] text-center text-sky-500" aria-hidden="true" />
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
                        <i className="fas fa-key w-5 h-5 mr-2 text-[1.15rem] text-center text-amber-500" aria-hidden="true" />
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
                        <i className="fas fa-right-from-bracket w-5 h-5 mr-2 text-[1.15rem] text-center text-slate-500" aria-hidden="true" />
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
          onNombreActualizado={(nombre) => mutate({ ...user, name: nombre }, false)}
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
