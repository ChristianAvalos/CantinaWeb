import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthPermisos from "./useAuthPermisos";

const ProtectedRoute = ({ permission, children }) => {
    const token = localStorage.getItem('AUTH_TOKEN');

    if (!token) {
        return <Navigate to="/auth/login" replace />;
    }

    const { hasPermission, loading, authError, connectionError } = useAuthPermisos();

    if (authError) {
        return <Navigate to="/auth/login" replace />;
    }


    // Mostrar un mensaje de carga solo para la parte protegida del contenido
    if (loading) {
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

        return <Navigate to="/error" replace />;
    }

    return (
        <>
            {children}
        </>
    );
};

export default ProtectedRoute;
