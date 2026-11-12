import { useEffect, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";

/**
 * Evalúa la contraseña con la misma regla del backend: 8+ caracteres, letras,
 * números y símbolos. Devuelve null mientras está vacía.
 */
const evaluarPassword = (valor) => {
    if (!valor) return null;

    const cumpleMinimo = valor.length >= 8
        && /[A-Za-z]/.test(valor)
        && /\d/.test(valor)
        && /[^A-Za-z0-9]/.test(valor);

    if (!cumpleMinimo) {
        return { nivel: 'debil', texto: 'Débil', ancho: 'w-1/3', color: 'bg-rose-500', textoColor: 'text-rose-600' };
    }

    let puntos = 0;
    if (valor.length >= 12) puntos++;
    if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos++;
    if (/\d/.test(valor)) puntos++;
    if (/[^A-Za-z0-9]/.test(valor)) puntos++;

    if (puntos >= 3) {
        return { nivel: 'fuerte', texto: 'Fuerte', ancho: 'w-full', color: 'bg-emerald-500', textoColor: 'text-emerald-600' };
    }

    return { nivel: 'media', texto: 'Media', ancho: 'w-2/3', color: 'bg-amber-500', textoColor: 'text-amber-600' };
};

const ChangePasswordModal = ({ isOpen, onClose, obligatorio = false }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [errores, setErrores] = useState({});
    // La sesión se mantiene: al cambiar la contraseña solo se refresca el usuario.
    const { mutate } = useAuth({ middleware: 'auth' })
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');
    const fortaleza = evaluarPassword(newPassword);


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
                newPassword: newPassword,
                newPassword_confirmation: repeatPassword,
            };

            // Con la contraseña por defecto ya se conoce la actual: no se envía.
            if (!obligatorio) {
                data.currentPassword = currentPassword;
            }

            const response = await clienteAxios.post('/api/cambiarpassword', data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }

                });
            //console.log(response)
            if (response.data.success) {
                toast.success('Contraseña actualizada con éxito');
                setCurrentPassword('');
                setNewPassword('');
                setRepeatPassword('');
                // Refresca /api/user (limpia `debe_cambiar_password`) sin cerrar sesión.
                await mutate();
                onClose();
            }
        } catch (error) {
            const mensaje = error.response?.data?.message || 'Ocurrió un error al cambiar la contraseña';
            if (error.response && error.response.status === 422) {
                const erroresValidacion = error.response.data.errors;
                setErrores((erroresValidacion && typeof erroresValidacion === 'object') ? erroresValidacion : { general: [mensaje] });
            } else if (error.response && error.response.status === 400) {
                // Mostrar el mensaje específico en el campo de contraseña actual
                setErrores({ currentPassword: [mensaje] });
            } else {
                console.error('Ocurrió un error al cambiar la contraseña', error);
                toast.error(mensaje);
            }

        }


    };

    return (
        isOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-[1050]">
                <div className="fixed inset-0 bg-black opacity-50" onClick={obligatorio ? undefined : onClose}></div>
                <div className="bg-white rounded-lg shadow-lg w-96 p-6 z-10">
                    <h2 className="text-lg font-bold mb-4">
                        {obligatorio ? 'Cambio de contraseña obligatorio' : 'Cambiar Contraseña'}
                    </h2>
                    {obligatorio && (
                        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Estás usando la contraseña inicial. Elegí una nueva para continuar.
                        </p>
                    )}
                    <form onSubmit={handleChangePassword}>
                        {!obligatorio && (
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
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">Nueva Contraseña</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full rounded-lg border ${errores.newPassword ? 'border-red-500' : 'border-gray-300'} bg-white p-2 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring focus:ring-blue-400`}

                            />
                            {fortaleza && (
                                <div className="mt-2" aria-live="polite">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                        <div className={`h-full rounded-full transition-all ${fortaleza.ancho} ${fortaleza.color}`} />
                                    </div>
                                    <p className={`mt-1 text-xs font-semibold ${fortaleza.textoColor}`}>
                                        Seguridad: {fortaleza.texto}
                                    </p>
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Mínimo 8 caracteres, con letras, números y un símbolo.
                            </p>
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
                        <div className={`flex ${obligatorio ? 'justify-end' : 'justify-between'}`}>
                            {!obligatorio && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    Cancelar
                                </button>
                            )}
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
