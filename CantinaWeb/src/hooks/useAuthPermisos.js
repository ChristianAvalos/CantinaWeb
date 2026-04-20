import React, { useEffect, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { isConnectionError, isUnauthorizedError } from "../helpers/requestErrors";

const CONNECTION_TOAST_ID = 'backend-connection-error';

const useAuthPermisos = () => {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [connectionError, setConnectionError] = useState(false);

    useEffect(() => {
        const fetchPermissions = async () => {
            const token = localStorage.getItem('AUTH_TOKEN');
            if (!token) {
                setPermissions([]);
                setAuthError(false);
                setConnectionError(false);
                setLoading(false);
                return;
            }

            try {
                setAuthError(false);
                setConnectionError(false);
                const { data } = await clienteAxios.get('/api/usuarios/permisos', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });


                if (data && data.role.permissions) {
                    const permissionNames = data.role.permissions.map(permission => permission.name);
                    setPermissions(permissionNames);
                }
            } catch (error) {
                if (isUnauthorizedError(error)) {
                    localStorage.removeItem('AUTH_TOKEN');
                    localStorage.removeItem('AUTH_USER_ID');
                    setAuthError(true);
                    setPermissions([]);
                } else if (isConnectionError(error)) {
                    setConnectionError(true);
                    toast.error('Sin conexion con el servidor. Intenta nuevamente.', { toastId: CONNECTION_TOAST_ID });
                }
                console.error('Error al obtener los permisos:', error);
            }finally {
                setLoading(false); 
            }
        };  

        fetchPermissions();
    }, []);

    // Función de utilidad para verificar permisos
    const hasPermission = (permissionName) => {
        return permissions.includes(permissionName);
    };

    return { permissions, hasPermission,loading, authError, connectionError };
};

export default useAuthPermisos;
