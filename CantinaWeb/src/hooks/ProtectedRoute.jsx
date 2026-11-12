import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import useAuthPermisos from "./useAuthPermisos";
import clienteAxios from "../config/axios";

const ProtectedRoute = ({ permission, adminOnly = false, children }) => {
    const token = localStorage.getItem('AUTH_TOKEN');
    const [userRole, setUserRole] = useState(null);
    // El portal de familias tiene su propio layout: nunca debe caer en el backoffice.
    const [esFamilia, setEsFamilia] = useState(false);
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
            setEsFamilia(res.data?.role?.name === 'Familia');
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

    const { hasPermission, isAdmin, loading, authError, connectionError } = useAuthPermisos();

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


    // Las cuentas del portal solo pueden estar en /familia.
    if (esFamilia && permission !== 'Portal_Familia') {
        return <Navigate to="/familia" replace />;
    }

    if (!hasPermission(permission)) {
        // Portal de familias: si por algún motivo no tiene el permiso, no se lo
        // manda al backoffice sino al login.
        if (esFamilia) {
            return <Navigate to="/familia" replace />;
        }

        // Si el usuario está autenticado pero no es admin (rol_id !== 1),
        // redirigir a /iniciousuarios en lugar de /error
        if (userRole !== null && userRole !== 1) {
            return <Navigate to="/iniciousuarios" replace />;
        }

        return <Navigate to="/error" replace />;
    }

    // Ruta exclusiva de administrador (rol_id = 1).
    if (adminOnly && !isAdmin) {
        if (esFamilia) {
            return <Navigate to="/familia" replace />;
        }

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
