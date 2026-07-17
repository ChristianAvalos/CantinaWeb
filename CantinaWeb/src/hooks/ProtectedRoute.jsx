import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthPermisos from "./useAuthPermisos";
import clienteAxios from "../config/axios";

const ProtectedRoute = ({ permission, children }) => {
    const token = localStorage.getItem('AUTH_TOKEN');
    const [userRole, setUserRole] = useState(null);
    const [roleLoaded, setRoleLoaded] = useState(false);

    // Obtener el rol del usuario para redirigir correctamente a no-admins
    useEffect(() => {
        if (!token) {
            setRoleLoaded(true);
            return;
        }

        clienteAxios('/api/user', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
            if (res.data?.rol_id != null) {
                setUserRole(Number(res.data.rol_id));
            }
        })
        .catch(() => {
            // Si falla, simplemente continuamos sin rol
        })
        .finally(() => {
            setRoleLoaded(true);
        });
    }, [token]);

    if (!token) {
        return <Navigate to="/auth/login" replace />;
    }

    const { hasPermission, loading, authError, connectionError } = useAuthPermisos();

    if (authError) {
        return <Navigate to="/auth/login" replace />;
    }


    // Mostrar un mensaje de carga solo para la parte protegida del contenido
    if (loading || !roleLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500">
                    
                </div>
                
            </div>
        );
    }

    if (connectionError) {
        return <Navigate to="/auth/login" replace />;
    }


    if (!hasPermission(permission)) {
        // Si el usuario está autenticado pero no es admin (rol_id !== 1),
        // redirigir a /iniciousuarios en lugar de /error
        if (userRole !== null && userRole !== 1) {
            return <Navigate to="/iniciousuarios" replace />;
        }

        return <Navigate to="/error" replace />;
    }

    return (
        <>
            {children}
        </>
    );
};

export default ProtectedRoute;
