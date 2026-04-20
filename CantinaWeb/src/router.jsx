import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";
import AuthLayout from "./layouts/AuthLayout";
import ProtectedRoute from "./hooks/ProtectedRoute";
import Spinner from './components/Spinner';

const Inicio = lazy(() => import("./views/Inicio"));
const Login = lazy(() => import("./views/Login"));
const Registro = lazy(() => import("./views/Registro"));
const Usuarios = lazy(() => import("./views/Usuarios"));
const Error = lazy(() => import("./views/Error"));
const InicioUsuarios = lazy(() => import("./views/InicioUsuarios"));
const RolesUsuarios = lazy(() => import("./views/RolesUsuarios"));
const UserReportRolesPermission = lazy(() => import("./report/UserReportRolesPermission"));
const Organizacion = lazy(() => import("./views/Organizacion"));
const ErrorEstadoUsuario = lazy(() => import("./views/ErrorEstadoUsuario"));
const Transacciones = lazy(() => import("./views/Transacciones"));
const Categorias = lazy(() => import("./views/Categorias"));
const Productos = lazy(() => import("./views/Productos"));
const Persona = lazy(() => import("./views/Personas"));
const Compras = lazy(() => import("./views/Compras"));
const Ventas = lazy(() => import("./views/Ventas"));
const Ajustes = lazy(() => import("./views/Ajustes"));

function withSuspense(element) {
    return <Suspense fallback={<Spinner />}>{element}</Suspense>;
}


const router = createBrowserRouter ([
    {
        path: '/',
        element:  <Layout/>,
        children: [
            {
                index:true,
                element: withSuspense(
                    <ProtectedRoute permission="Principal">
                        <Inicio/>
                    </ProtectedRoute>
                )
            },
            {
                path:'/usuarios',
                element: withSuspense(
                <ProtectedRoute permission="Herraminetas_usuarios">
                    <Usuarios/>
                </ProtectedRoute>
                )
            },
            {
                path:'/usuarios/roles',
                element: withSuspense(
                <ProtectedRoute permission="Herraminetas_usuarios">
                    <RolesUsuarios/>
                </ProtectedRoute>
                )
            },
            {
                path:'/error',
                element: withSuspense(<Error/>)
            },

            {
                path:'/iniciousuarios',
                element: withSuspense(<InicioUsuarios/>)
            },
            {
                path:'/usuarios/reporte',
                element: withSuspense(
                <ProtectedRoute permission="Reporte_Usuarios">
                    <UserReportRolesPermission/>
                </ProtectedRoute>
                )
            },
            {
                path:'/organizacion',
                element: withSuspense(
                <ProtectedRoute permission="Organizacion">
                    <Organizacion/>
                </ProtectedRoute>
                )
            },
            {
                path:'/productos',
                element: withSuspense(
                <ProtectedRoute permission="Productos">
                    <Productos/>
                </ProtectedRoute>
                )
            },
            {
                path:'/compras',
                element: withSuspense(
                <ProtectedRoute permission="Compras">
                    <Compras/>
                </ProtectedRoute>
                )
            },
            {
                path:'/ventas',
                element: withSuspense(
                <ProtectedRoute permission="Ventas">
                    <Ventas/>
                </ProtectedRoute>
                )
            },
            {
                path:'/ajustes',
                element: withSuspense(
                <ProtectedRoute permission="Ajustes">
                    <Ajustes/>
                </ProtectedRoute>
                )
            },
            {
                path:'/transacciones',
                element: withSuspense(
                <ProtectedRoute permission="Transacciones">
                    <Transacciones/>
                </ProtectedRoute>
                )
            },
            {
                path:'/categorias',
                element: withSuspense(
                <ProtectedRoute permission="Categorias">
                    <Categorias/>
                </ProtectedRoute>
                )
            },
            {
                path:'/personas',
                element: withSuspense(
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
                element: withSuspense(<Login />)
            },
            {
                path: '/auth/registro',
                element: withSuspense(<Registro/>)
            }
        ]
    },
    {
        path:'/errorEstadoUsuario',
        element: withSuspense(<ErrorEstadoUsuario/>)
    }
])

export default router