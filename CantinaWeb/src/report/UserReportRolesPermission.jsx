import React, { useEffect, useState } from 'react';
import clienteAxios from "../config/axios";

function UserReport() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 
    //obtengo el token
    const token = localStorage.getItem('AUTH_TOKEN');

    useEffect(() => {
        clienteAxios.get('/api/reporte/usuarios', {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        })
            .then(response => setUsers(response.data))
            .catch(error => console.error(error));
    }, []);

    // Asegúrate de que esta función se llame correctamente
    const downloadReport = async (filteredData) => {
        try {
            const response = await clienteAxios.post('/api/reporte/usuarios/descarga', 
            {
                users: filteredData,
            }, 
            {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                },
                
                    responseType: 'blob', 
                
            }
            );

            // Manejar la respuesta, por ejemplo, si es un archivo para descargar
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'reporte_usuarios.pdf'); 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // Limpiar el enlace después de la descarga
        } catch (error) {
            console.error("Error al descargar el reporte:", error);
        }
    };

    // Filtrar usuarios en función del término de búsqueda
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 underline">Reporte de usuario(s).</h2>
            
            <div className="mb-4 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Buscar usuario..."
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)} // Actualizar el término de búsqueda
                />
                <button
                    onClick={() => downloadReport(filteredUsers)} // Llamar a la función de descarga con los usuarios filtrados
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
                >
                    Descargar PDF
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-4 py-2 border-b-2 border-gray-200 text-left text-sm font-semibold text-gray-600">Usuario</th>
                            <th className="px-4 py-2 border-b-2 border-gray-200 text-left text-sm font-semibold text-gray-600">Roles</th>
                            <th className="px-4 py-2 border-b-2 border-gray-200 text-left text-sm font-semibold text-gray-600">Permisos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="odd:bg-white even:bg-gray-50">
                                <td className="px-4 py-2 border-b border-gray-200 text-gray-700">{user.name}</td>
                                <td className="px-4 py-2 border-b border-gray-200 text-gray-700">{user.role ? user.role.name : 'SIN ROL'}</td>
                                <td className="px-4 py-2 border-b border-gray-200 text-gray-700">
                                <ul className="list-disc list-inside text-gray-700">
                                    {user.role?.permissions && user.role.permissions.length > 0 ? (
                                        user.role.permissions.map(permission => (
                                        <li key={permission.id}>{permission.name}</li>
                                        ))
                                    ) : (
                                        <li>No hay permisos</li>  
                                    )}
                                </ul>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mostrar la cantidad de registros filtrados */}
            <div className="mt-4 text-gray-700">
            Cantidad: {filteredUsers.length} {filteredUsers.length === 1 ? 'registro' : 'registros'}.
            </div>
        </div>
    );
}

export default UserReport;
