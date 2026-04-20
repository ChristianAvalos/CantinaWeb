import React, { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import clienteAxios from "../config/axios";

const ModalRolPermisos = ({ roleId, onClose, refrescarRoles }) => {
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const token = localStorage.getItem('AUTH_TOKEN');

    useEffect(() => {
        clienteAxios.get(`/api/roles/${roleId}/permisos`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        }).then(response => {
            setPermissions(response.data.permissions);
            setRolePermissions(response.data.rolePermissions);
        });
    }, [roleId]);

    const handleCheckboxChange = (permissionId) => {
        if (rolePermissions.includes(permissionId)) {
            setRolePermissions(rolePermissions.filter(id => id !== permissionId));
        } else {
            setRolePermissions([...rolePermissions, permissionId]);
        }
    };


    // Función para seleccionar todos los permisos
    const handleSelectAll = () => {
        const allPermissionIds = permissions.map(permission => permission.id);
        setRolePermissions(allPermissionIds);
    };

    // Función para desmarcar todos los permisos
    const handleDeselectAll = () => {
        setRolePermissions([]);
    };

    const handleSave = () => {
        clienteAxios.post(`/api/roles/${roleId}/permisos`, { permissions: rolePermissions }, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        })
            .then(() => refrescarRoles());

        //Muestro el mensaje de guardado 
        toast.success('Operación exitosa');
        //guardo y cierro 
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Asignar Permisos</h2>

                {/* Botones de seleccionar todo y desmarcar todo */}
                <div className="flex justify-between mb-3 border-b pb-2">
                    <button
                        onClick={handleSelectAll}
                        className="flex items-center bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600 transition duration-200"
                    >
                        <img src="/img/checked.png" alt="Seleccionar Todo" className="w-4 h-4 mr-1" />
                        Seleccionar Todo
                    </button>

                    <button
                        onClick={handleDeselectAll}
                        className="flex items-center g360-danger text-white text-sm px-3 py-1 rounded hover:opacity-90 transition duration-200"
                    >
                        <img src="/img/unchecked.png" alt="Desmarcar Todo" className="w-4 h-4 mr-1" />
                        Desmarcar Todo
                    </button>
                </div>




                <ul className="space-y-2">
                    {permissions.map(permission => (
                        <li key={permission.id}>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rolePermissions.includes(permission.id)}
                                    onChange={() => handleCheckboxChange(permission.id)}
                                    className="mr-2"
                                />
                                {permission.name}
                            </label>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-end space-x-2 mt-4">
                    <button
                        onClick={handleSave}
                        className="g360-gradient text-white px-4 py-2 rounded-lg hover:opacity-90"
                    >
                        Guardar
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalRolPermisos;
