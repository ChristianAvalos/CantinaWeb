import { Link, useLocation } from "react-router-dom"
import React, { useEffect, useState } from 'react';
import useAuthPermisos from "../hooks/useAuthPermisos";
import { useTheme } from '../context/ThemeContext';

const buildExpandedSections = (pathname) => ({
  operaciones: pathname === '/compras' || pathname === '/ventas' || pathname === '/ajustes' || pathname === '/transacciones',
  definiciones: pathname === '/productos' || pathname === '/categorias' || pathname === '/personas',
  herramientas: pathname === '/organizacion' || pathname === '/usuarios' || pathname === '/usuarios/roles',
  reportes: pathname === '/usuarios/reporte',
});

export default function SideNav() {
  const { hasPermission, loading } = useAuthPermisos();
  const { theme } = useTheme();
  const location = useLocation();

  // Estado para el término de búsqueda y los ítems del menú
  const [searchTerm, setSearchTerm] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [expandedSections, setExpandedSections] = useState(() => buildExpandedSections(location.pathname));

  const isLightTheme = theme.on === '15 23 42';
  const dividerColor = isLightTheme ? `rgba(${theme.on}, 0.14)` : 'rgba(255, 255, 255, 0.1)';
  const sidenavStyle = {
    backgroundColor: `rgb(${theme.from})`,
    backgroundImage: `linear-gradient(180deg, rgb(${theme.from}) 0%, rgb(${theme.to}) 100%)`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    color: `rgb(${theme.on})`,
    borderRightColor: dividerColor,
  };
  const loadingStyle = {
    backgroundColor: `rgb(${theme.from})`,
    backgroundImage: `linear-gradient(180deg, rgb(${theme.from}) 0%, rgb(${theme.to}) 100%)`,
    color: `rgb(${theme.on})`,
  };
  const sectionTitleClasses = "mt-5 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-extrabold uppercase tracking-[0.14em] transition hover:bg-white/10";
  const itemLinkClasses = "flex items-center gap-3 rounded-xl px-3 py-2 text-[1.02rem] font-semibold transition hover:bg-white/10";
  const getItemLinkClasses = (path) => {
    const isActive = location.pathname === path;

    if (isActive) {
      return `${itemLinkClasses} bg-white/20 shadow-sm ring-1 ring-white/20`;
    }

    return itemLinkClasses;
  };

  // Función para manejar el cambio del input de búsqueda
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // useEffect para extraer automáticamente los ítems del menú
  useEffect(() => {
    // Crear un observador para detectar cambios en el DOM
    const observer = new MutationObserver(() => {
      // Obtener los ítems dinámicamente del DOM usando querySelectorAll
      const links = document.querySelectorAll(".nav-item .nav-link");
      const items = Array.from(links).map(link => {
        const route = link.getAttribute('href'); // Obtener el atributo to directamente del Link
        const textElement = link.querySelector('p'); // Buscar el elemento <p> dentro del Link
        const text = textElement ? textElement.textContent.trim().toLowerCase() : '';

        return {
          text: text,
          route: route, // Guardar la ruta junto con el texto
          originalElement: link
        };
      });
      // Actualizar el estado solo si hay un cambio real
      setMenuItems(prevItems => {
        const newItems = items.filter(item => !prevItems.some(prev => prev.text === item.text));
        if (newItems.length === 0) return prevItems;
        return [...prevItems, ...newItems];
      });
    });

    // Observar cambios en el contenedor principal de la barra lateral
    const sidebar = document.querySelector('.main-sidebar');
    if (sidebar) {
      observer.observe(sidebar, { childList: true, subtree: true });
    }

    // Desconectar el observador cuando se desmonte el componente
    return () => observer.disconnect();
  }, []); // Solo ejecuta al montar

  useEffect(() => {
    setExpandedSections((prev) => ({
      ...prev,
      ...buildExpandedSections(location.pathname),
    }));
  }, [location.pathname]);


  // Función para normalizar cadenas (eliminar acentos y convertir a minúsculas)
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD") // elimina acentos
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Filtrar los ítems del menú según el término de búsqueda
  const filteredMenuItems = menuItems.filter(item =>
    normalize(item.text).includes(normalize(searchTerm))
  );

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const handleSectionToggle = (event, sectionName) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSection(sectionName);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={loadingStyle}>
        <span className="text-lg font-bold">Cargando menu...</span>
      </div>
    );
  }


  return (
      <div className="flex h-full min-h-full w-full">
      <div className="sidebar flex h-full min-h-full flex-1 flex-col overflow-y-auto border-r shadow-2xl" style={sidenavStyle}>
        <div className="flex flex-col items-center gap-4 px-5 pb-4 pt-6">
          <div className="flex justify-center">
            {hasPermission('Principal') ? (

              <Link to="/" className="flex justify-center">
                <img
                  src="/img/Logo Institucional.png"
                  alt="CDSystem"
                  className="mb-4 h-24 w-24 rounded-full bg-slate-50 object-contain p-2 shadow-sm"
                />
              </Link>
            ) : (
              <img
                src="/img/Logo Institucional.png"
                alt="CDSystem"
                className="h-24 w-24 rounded-full bg-white object-contain p-2 shadow-sm"
              />
            )}
          </div>
          <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />
        </div>

        <div className="px-3">
          <div className="hidden">
            <input
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm placeholder:text-white/70"
              type="search"
              placeholder="Buscar"
              aria-label="Search"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>

        {searchTerm && (
          <div className="px-3 pb-2">
            {filteredMenuItems && filteredMenuItems.length > 0 ? (
              <ul className="space-y-1">
                {filteredMenuItems.map((item, index) => {
                  return (
                    <li key={index}>
                      <Link to={item.route || "#"} className={itemLinkClasses}>
                        <i className="fas fa-circle h-5 w-5 shrink-0 text-center text-[0.6rem]" />
                        <span>{item.text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm font-semibold">No hay resultados</div>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 pb-6">
          <ul className="space-y-1" role="menu">

            {(hasPermission('Transacciones') || hasPermission('Categorias')  
                || hasPermission('Compras') || hasPermission('Ventas') || hasPermission('Ajustes')         
              )
            && (

              <li>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'operaciones')} className={sectionTitleClasses}>
                  <span>Operaciones</span>
                  <i className={`fas fa-angle-left text-sm transition-transform ${expandedSections.operaciones ? '-rotate-90' : ''}`}></i>
                </button>
                <ul className={`space-y-1 overflow-hidden pl-2 transition-all ${expandedSections.operaciones ? 'mt-2 max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasPermission('Compras') && (
                    <li>
                      <Link to="/compras" className={getItemLinkClasses('/compras')}>
                        <img src="/img/Icon/shopping-cart-arrow-in.png" alt="Compras" className="h-5 w-5 shrink-0" />
                        <span>Compras</span>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Ventas') && (
                    <li>
                      <Link to="/ventas" className={getItemLinkClasses('/ventas')}>
                        <img src="/img/Icon/shopping-cart-arrow-out.png" alt="Ventas" className="h-5 w-5 shrink-0" />
                        <span>Ventas</span>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Ajustes') && (
                    <li>
                      <Link to="/ajustes" className={getItemLinkClasses('/ajustes')}>
                        <img src="/img/Icon/processes-filled.png" alt="Ajustes" className="h-5 w-5 shrink-0" />
                        <span>Ajustes</span>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Transacciones') && (
                    <li>
                      <Link to="/transacciones" className={getItemLinkClasses('/transacciones')}>
                        <img src="/img/Icon/sort.png" alt="Transacciones" className="h-5 w-5 shrink-0" />
                        <span>Transacciones</span>
                      </Link>
                    </li>
                  )}


                </ul>
              </li>

            )}
            {(hasPermission('Categorias') || hasPermission('Personas') || hasPermission('Productos'))  && (

                          <li>
                            <button type="button" onClick={(event) => handleSectionToggle(event, 'definiciones')} className={sectionTitleClasses}>
                              <span>Definiciones</span>
                              <i className={`fas fa-angle-left text-sm transition-transform ${expandedSections.definiciones ? '-rotate-90' : ''}`}></i>
                </button>
                            <ul className={`space-y-1 overflow-hidden pl-2 transition-all ${expandedSections.definiciones ? 'mt-2 max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasPermission('Productos') && (
                                <li>
                                  <Link to="/productos" className={getItemLinkClasses('/productos')}>
                                    <img src="/img/Icon/product-filled.bmp" alt="Productos" className="h-5 w-5 shrink-0" />
                                    <span>Productos</span>
                      </Link>
                    </li>
                  )}
                  
                  {hasPermission('Categorias') && (
                                <li>
                                  <Link to="/categorias" className={getItemLinkClasses('/categorias')}>
                                    <img src="/img/Icon/tag-filled-green.png" alt="Categorias" className="h-5 w-5 shrink-0" />
                                    <span>Categorias</span>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Personas') && (
                                <li>
                                  <Link to="/personas" className={getItemLinkClasses('/personas')}>
                                    <img src="/img/Icon/business-card-man.png" alt="Clientes y proveedores" className="h-5 w-5 shrink-0" />
                                    <span>Clientes/Proveedores</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>

            )}

            {(hasPermission('Herraminetas_usuarios') || hasPermission('Organizacion')) && (

              <li>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'herramientas')} className={sectionTitleClasses}>
                  <span>Herramientas</span>
                  <i className={`fas fa-angle-left text-sm transition-transform ${expandedSections.herramientas ? '-rotate-90' : ''}`}></i>
                </button>
                <ul className={`space-y-1 overflow-hidden pl-2 transition-all ${expandedSections.herramientas ? 'mt-2 max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasPermission('Organizacion') && (
                    <li>
                      <Link to="/organizacion" className={getItemLinkClasses('/organizacion')}>
                        <img src="/img/Icon/organogram.png" alt="Organizacion" className="h-5 w-5 shrink-0" />
                        <span>Organizacion</span>
                      </Link>
                    </li>
                  )}


                  {hasPermission('Herraminetas_usuarios') && (

                    <>
                      <li>
                        <Link to="/usuarios" className={getItemLinkClasses('/usuarios')}>
                          <img src="/img/Icon/user-group.png" alt="Usuarios" className="h-5 w-5 shrink-0" />
                          <span>Usuarios</span>
                        </Link>
                      </li>


                      <li>
                        <Link to="/usuarios/roles" className={getItemLinkClasses('/usuarios/roles')}>
                          <img src="/img/Icon/manage-user.png" alt="Roles usuario" className="h-5 w-5 shrink-0" />
                          <span>Roles usuario</span>
                        </Link>
                      </li>
                    </>

                  )}

                </ul>

              </li>

            )}


            {hasPermission('Reporte_Usuarios') && (

              <li>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'reportes')} className={sectionTitleClasses}>
                  <span>Reportes</span>
                  <i className={`fas fa-angle-left text-sm transition-transform ${expandedSections.reportes ? '-rotate-90' : ''}`}></i>
                </button>
                <ul className={`space-y-1 overflow-hidden pl-2 transition-all ${expandedSections.reportes ? 'mt-2 max-h-28 opacity-100' : 'max-h-0 opacity-0'}`}>

                  {hasPermission('Reporte_Usuarios') && (
                    <li>
                      <Link to="/usuarios/reporte" className={getItemLinkClasses('/usuarios/reporte')}>
                        <img src="/img/Icon/report-print.png" alt="Reporte de usuarios" className="h-5 w-5 shrink-0" />
                        <span>Reporte de usuarios</span>
                      </Link>
                    </li>
                  )}

                </ul>
              </li>
            )}


          </ul>
        </nav>
      </div>
    </div>
  )
}
