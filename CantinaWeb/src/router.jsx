import { createBrowserRouter,Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";
import AuthLayout from "./layouts/AuthLayout";
import Inicio from "./views/Inicio";
import Login from "./views/Login";
import Registro from "./views/Registro";
import Usuarios from "./views/Usuarios";
import Error from "./views/Error";
import ProtectedRoute from "./hooks/ProtectedRoute";
import InicioUsuarios from "./views/InicioUsuarios";
import RolesUsuarios from "./views/RolesUsuarios";
import UserReportRolesPermission from "./report/UserReportRolesPermission";
import Organizacion from "./views/Organizacion";
import ErrorEstadoUsuario from "./views/ErrorEstadoUsuario";
import Transacciones from "./views/Transacciones";
import Categorias from "./views/Categorias";
import Productos from "./views/Productos";
import Persona from "./views/Personas";
import Compras from "./views/Compras";
import Ventas from "./views/Ventas";
import Ajustes from "./views/Ajustes";


const router = createBrowserRouter ([
    {
        path: '/',
        element:  <Layout/>,
        children: [
            {
                index:true,
                element: (
                    <ProtectedRoute permission="Principal">
                        <Inicio/>
                    </ProtectedRoute>
            
                    )
                    },
            {
                path:'/usuarios',
                
                element: (
                <ProtectedRoute permission="Herraminetas_usuarios">
                    <Usuarios/>
                </ProtectedRoute>
                )
            },
            {
                path:'/usuarios/roles',
                
                element: (
                <ProtectedRoute permission="Herraminetas_usuarios">
                    <RolesUsuarios/>
                </ProtectedRoute>
                )
            },
            {
                path:'/error',
                element: <Error/>
            },

            {
                path:'/iniciousuarios',
                element: <InicioUsuarios/>
            },
            {
                path:'/usuarios/reporte',
                
                element: (
                <ProtectedRoute permission="Reporte_Usuarios">
                    <UserReportRolesPermission/>
                </ProtectedRoute>
                )
            },
            {
                path:'/organizacion',
                
                element: (
                <ProtectedRoute permission="Organizacion">
                    <Organizacion/>
                </ProtectedRoute>
                )
            },
            {
                path:'/productos',
                
                element: (
                <ProtectedRoute permission="Productos">
                    <Productos/>
                </ProtectedRoute>
                )
            },
            {
                path:'/compras',
                
                element: (
                <ProtectedRoute permission="Compras">
                    <Compras/>
                </ProtectedRoute>
                )
            },
            {
                path:'/ventas',
                
                element: (
                <ProtectedRoute permission="Ventas">
                    <Ventas/>
                </ProtectedRoute>
                )
            },
            {
                path:'/ajustes',
                
                element: (
                <ProtectedRoute permission="Ajustes">
                    <Ajustes/>
                </ProtectedRoute>
                )
            },
            {
                path:'/transacciones',
                
                element: (
                <ProtectedRoute permission="Transacciones">
                    <Transacciones/>
                </ProtectedRoute>
                )
            },
            {
                path:'/categorias',
                
                element: (
                <ProtectedRoute permission="Categorias">
                    <Categorias/>
                </ProtectedRoute>
                )
            },
            {
                path:'/personas',
                
                element: (
                <ProtectedRoute permission="Personas">
                    <Persona/>
                </ProtectedRoute>
                )
            },
        ]
    },
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            {
                path: '', // Ruta vacía para '/auth'
                element: <Navigate to="/auth/login" replace /> // Redirigir a '/auth/login'
            },
            {
                path:'/auth/login',
                element: <Login />
            },
            {
                path: '/auth/registro',
                element: <Registro/>
            }
        ]
    },
    {
        path:'/errorEstadoUsuario',
        element: (
                <ErrorEstadoUsuario/>
    
            )
        
        
    }
])

export default router