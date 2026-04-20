import { Link, useLocation } from "react-router-dom"
import React, { useEffect, useState } from 'react';
import useAuthPermisos from "../hooks/useAuthPermisos";

const buildExpandedSections = (pathname) => ({
  operaciones: pathname === '/compras' || pathname === '/ventas' || pathname === '/ajustes' || pathname === '/transacciones',
  definiciones: pathname === '/productos' || pathname === '/categorias' || pathname === '/personas',
  herramientas: pathname === '/organizacion' || pathname === '/usuarios' || pathname === '/usuarios/roles',
  reportes: pathname === '/usuarios/reporte',
});

export default function SideNav() {


  const { permissions, hasPermission } = useAuthPermisos();
  const location = useLocation();

  // Estado para el término de búsqueda y los ítems del menú
  const [searchTerm, setSearchTerm] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [expandedSections, setExpandedSections] = useState(() => buildExpandedSections(location.pathname));

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




  //esto es para ver la cantidad de permisos que tiene
  //   permissions.forEach(permission => {
  //     console.log(`El usuario tiene permiso: ${permission}`);
  // });


  return (
    <>
      {/* Main Sidebar Container */}


      <div className="sidebar h-full g360-sidenav g360-gradient">
        {/* Sidebar user panel (optional) */}
        <div className="user-panel mt-3 pb-3 mb-3 flex justify-center">
          <div className="info">
            {hasPermission('Principal') ? (

              <Link to="/" className="flex justify-center">
                <img
                  src="/img/Logo Institucional.png"
                  alt="CDSystem"
                  className="rounded-full bg-white w-50 h-30"
                />
              </Link>
            ) : (
              <img
                src="/img/Logo Institucional.png"
                alt="CDSystem"
                className="rounded-full bg-white w-50 h-30"
              />
            )}
          </div>
        </div>

        {/* SidebarSearch Form */}
        {/* ocultado por ahora */}
        <div className="form-inline hidden">
          <div className="input-group" data-widget="sidebar-search">
            <input
              className="form-control form-control-sidebar"
              type="search"
              placeholder="Buscar"
              aria-label="Search"
              value={searchTerm}
              onChange={handleSearch}
            />
            <div className="input-group-append">
              <button className="btn btn-sidebar">
                <div className="font-bold">
                  <i className="fas fa-search fa-fw" />
                </div>
              </button>
            </div>
          </div>
        </div>


        {/* Mostrar los items filtrados solo si hay término de búsqueda */}
        {searchTerm && (
          <>
            {filteredMenuItems && filteredMenuItems.length > 0 ? (
              <ul className="nav nav-pills nav-sidebar flex-column">
                {filteredMenuItems.map((item, index) => {
                  console.log("Index:", index, "Item:", item); // 👈 aquí ves en consola
                  return (
                    <li key={index} className="nav-item">
                      <Link to={item.route || "#"} className="nav-link">
                        <div className="font-bold">
                          <i className="nav-icon fas fa-circle"></i>
                          <p>{item.text}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="ml-3 mt-2">No hay resultados</div>
            )}


          </>
        )}


        {/* Sidebar Menu */}
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" role="menu" data-accordion="false">

            {(hasPermission('Transacciones') || hasPermission('Categorias')  
                || hasPermission('Compras') || hasPermission('Ventas') || hasPermission('Ajustes')         
              )
            && (

              <li className={`nav-item has-treeview ${expandedSections.operaciones ? 'menu-open' : ''}`}>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'operaciones')} className="nav-link underline w-full border-0 bg-transparent text-left">

                  <p>
                    Operaciones
                    <i className={`right fas fa-angle-left transition-transform ${expandedSections.operaciones ? 'rotate-[-90deg]' : ''}`}></i>
                  </p>
                </button>
                <ul className="nav nav-treeview" style={{ display: expandedSections.operaciones ? 'block' : 'none' }}>
                  {hasPermission('Compras') && (
                    <li className="nav-item ml-2">
                      <Link to="/compras" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/shopping-cart-arrow-in.png" alt="Transacciones" className="w-5 h-5 mr-2" />
                          {/* <i className="far fa-address-card"></i> */}
                          <p className="ml-2 font-bold">Compras</p>
                        </div>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Ventas') && (
                    <li className="nav-item ml-2">
                      <Link to="/ventas" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/shopping-cart-arrow-out.png" alt="Transacciones" className="w-5 h-5 mr-2" />
                          {/* <i className="far fa-address-card"></i> */}
                          <p className="ml-2 font-bold">Ventas</p>
                        </div>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Ajustes') && (
                    <li className="nav-item ml-2">
                      <Link to="/ajustes" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/processes-filled.png" alt="Transacciones" className="w-5 h-5 mr-2" />
                          {/* <i className="far fa-address-card"></i> */}
                          <p className="ml-2 font-bold">Ajustes</p>
                        </div>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Transacciones') && (
                    <li className="nav-item ml-2">
                      <Link to="/transacciones" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/sort.png" alt="Transacciones" className="w-5 h-5 mr-2" />
                          {/* <i className="far fa-address-card"></i> */}
                          <p className="ml-2 font-bold">Transacciones</p>
                        </div>
                      </Link>
                    </li>
                  )}


                </ul>
              </li>

            )}
            {(hasPermission('Categorias') || hasPermission('Personas') || hasPermission('Productos'))  && (

              <li className={`nav-item has-treeview ${expandedSections.definiciones ? 'menu-open' : ''}`}>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'definiciones')} className="nav-link underline w-full border-0 bg-transparent text-left">

                  <p>
                    Definiciones
                    <i className={`right fas fa-angle-left transition-transform ${expandedSections.definiciones ? 'rotate-[-90deg]' : ''}`}></i>
                  </p>
                </button>
                <ul className="nav nav-treeview" style={{ display: expandedSections.definiciones ? 'block' : 'none' }}>
                  {hasPermission('Productos') && (
                    <li className="nav-item ml-2">
                      <Link to="/productos" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/product-filled.bmp" alt="Productos" className="w-5 h-5 mr-2" />
                          {/* <i className="far fa-address-card"></i> */}
                          <p className="ml-2 font-bold">Productos</p>
                        </div>
                      </Link>
                    </li>
                  )}
                  
                  {hasPermission('Categorias') && (
                    <li className="nav-item ml-2">
                      <Link to="/categorias" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/tag-filled-green.png" alt="Categorias" className="w-5 h-5 mr-2" />
                          {/* <i className="fas fa-tags"></i> */}
                          <p className="ml-2">Categorías</p>
                        </div>
                      </Link>
                    </li>
                  )}

                  {hasPermission('Personas') && (
                    <li className="nav-item ml-2">
                      <Link to="/personas" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/business-card-man.png" alt="Categorias" className="w-5 h-5 mr-2" />
                          {/* <i className="fas fa-tags"></i> */}
                          <p className="ml-2">Clientes/Proveedores</p>
                        </div>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>

            )}

            {(hasPermission('Herraminetas_usuarios') || hasPermission('Organizacion')) && (

              <li className={`nav-item has-treeview ${expandedSections.herramientas ? 'menu-open' : ''}`}>
                <button type="button" onClick={(event) => handleSectionToggle(event, 'herramientas')} className="nav-link underline w-full border-0 bg-transparent text-left">

                  <p>
                    Herramientas
                    <i className={`right fas fa-angle-left transition-transform ${expandedSections.herramientas ? 'rotate-[-90deg]' : ''}`}></i>
                  </p>
                </button>
                <ul className="nav nav-treeview" style={{ display: expandedSections.herramientas ? 'block' : 'none' }}>
                  {hasPermission('Organizacion') && (
                    <li className="nav-item ml-2">
                      <Link to="/organizacion" className="nav-link flex items-center">
                        <div className="font-bold flex items-center">
                          <img src="/img/Icon/organogram.png" alt="Organigrama" className="w-5 h-5 mr-2" />
                          {/* <i className="fas fa-sitemap"></i> */}
                          <p className="ml-2">Organización</p>
                        </div>
                      </Link>
                    </li>
                  )}


                  {hasPermission('Herraminetas_usuarios') && (

                    <ul className="nav nav-pills ">
                      <li className="nav-item ml-2">
                        <Link to="/usuarios" className="nav-link flex items-center">
                          <div className="font-bold flex items-center">
                            <img src="/img/Icon/user-group.png" alt="User" className="w-5 h-5 mr-2" />
                            {/* <i className="fas fa-user"></i> */}
                            <p className="ml-2">Usuarios</p>
                          </div>
                        </Link>
                      </li>


                      <li className="nav-item ml-2">
                        <Link to="/usuarios/roles" className="nav-link flex items-center">
                          <div className="font-bold flex items-center">
                            <img src="/img/Icon/manage-user.png" alt="Roles User" className="w-5 h-5 mr-2" />
                            {/* <i className="fas fa-user-tag"></i> */}
                            <p className="ml-2">Roles usuario </p>
                          </div>
                        </Link>
                      </li>
                    </ul>

                  )}

                </ul>

              </li>

            )}


            {hasPermission('Reporte_Usuarios') && (

              <li className={`nav-item has-treeview ${expandedSections.reportes ? 'menu-open' : ''}`}>
                <button type="button" onClick={() => toggleSection('reportes')} className="nav-link underline w-full border-0 bg-transparent text-left">

                  <p>
                    Reportes
                    <i className={`right fas fa-angle-left transition-transform ${expandedSections.reportes ? 'rotate-[-90deg]' : ''}`}></i>
                  </p>
                </button>
                <ul className="nav nav-treeview" style={{ display: expandedSections.reportes ? 'block' : 'none' }}>

                  {hasPermission('Reporte_Usuarios') && (
                    <li className="nav-item ml-2">
                      <Link to="/usuarios/reporte" className="nav-link flex items-center">
                        <img src="/img/Icon/report-print.png" alt="Report" className="w-5 h-5 mr-2" />
                        {/* <i className="fas fa-file-invoice"></i> */}
                        <p className="ml-2">Reporte de usuarios</p>
                      </Link>
                    </li>
                  )}

                </ul>
              </li>
            )}


          </ul>
        </nav>
        {/* /.sidebar-menu */}
      </div>
      {/* /.sidebar */}


    </>
  )
}
