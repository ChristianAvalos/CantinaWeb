import { Player } from '@lottiefiles/react-lottie-player';
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Error() {
    // Obtener el token de autenticación
    const navigate = useNavigate();
    const token = localStorage.getItem('AUTH_TOKEN');
    // Usar useEffect para redirigir después del renderizado
    useEffect(() => {
        if (!token) {
            navigate('/auth/login'); // Redirige al login si no hay token
        }
    }, [token, navigate]);
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold text-red-600">Usuario inactivo</h1>
            <p className="text-xl text-gray-600">Contacte con el administrador del sistema.</p>

            {/* Lottie animación */}
            <Player
                autoplay
                loop
                src="/img/AnimacionRobto.json"
                style={{ height: '250px', width: '250px' }}
            />
        </div>
    )
}

