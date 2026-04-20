import { useEffect, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [errores, setErrores] = useState({});
    const { logout } = useAuth({ middleware: 'auth' })
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');


    const handleChangePassword = async (e) => {
        e.preventDefault();
        // Validar que las contraseñas coincidan
        if (newPassword !== repeatPassword) {
            setErrores({});
            toast.warning('Las contraseñas no coinciden');
            return;
        }


        try {
            const data = {
                currentPassword: currentPassword,
                newPassword: newPassword,
                newPassword_confirmation: repeatPassword,
            };

            console.log('Datos enviados (cambiar contraseña):', data);
            const response = await clienteAxios.post('/api/cambiarpassword', data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }

                });
            //console.log(response)
            if (response.data.success) {
                // Contraseña cambiada exitosamente
                toast.success('Contraseña actualizada con éxito');
                setCurrentPassword('');
                setNewPassword('');
                setRepeatPassword('');
                onClose();
                logout();

            }
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrores(error.response.data.errors);
            } else if (error.response && error.response.status === 400) {
                // Mostrar el mensaje específico en el campo de contraseña actual
                setErrores({ currentPassword: [error.response.data.message] });
            } else {
                console.error('Ocurrió un error al cambiar la contraseña', error);
                toast.error('Ocurrió un error al cambiar la contraseña');
            }

        }


    };

    return (
        isOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
                <div className="bg-white rounded-lg shadow-lg w-96 p-6 z-10">
                    <h2 className="text-lg font-bold mb-4">Cambiar Contraseña</h2>
                    <form onSubmit={handleChangePassword}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="currentPassword">Contraseña Actual</label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={`w-full rounded-lg border ${errores.currentPassword ? 'border-red-500' : 'border-gray-300'} bg-white p-2 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring focus:ring-blue-400`}

                            />
                            {errores.currentPassword && <p className="text-red-500 text-sm">{errores.currentPassword[0]}</p>}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">Nueva Contraseña</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full rounded-lg border ${errores.newPassword ? 'border-red-500' : 'border-gray-300'} bg-white p-2 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring focus:ring-blue-400`}

                            />
                            {errores.newPassword && <p className="text-red-500 text-sm">{errores.newPassword[0]}</p>}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="repeatPassword">Repetir Nueva Contraseña</label>
                            <input
                                type="password"
                                id="repeatPassword"
                                value={repeatPassword}
                                onChange={(e) => setRepeatPassword(e.target.value)}
                                className={`w-full rounded-lg border ${errores.repeatPassword ? 'border-red-500' : 'border-gray-300'} bg-white p-2 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring focus:ring-blue-400`}

                            />
                            {errores.repeatPassword && <p className="text-red-500 text-sm">{errores.repeatPassword[0]}</p>}
                        </div>
                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="g360-gradient text-white rounded-lg px-4 py-2 hover:opacity-90"
                            >
                                Cambiar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    );
};

export default ChangePasswordModal;
