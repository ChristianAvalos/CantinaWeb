import { Player } from '@lottiefiles/react-lottie-player';
export default function InicioUsuarios() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            {/* Animación Lottie */}
            <Player
                autoplay
                loop
                src="/img/RobotSaludando.json" 
                style={{ height: '300px', width: '300px' }}
            />

            {/* Texto debajo de la animación */}
            <h1 className="text-2xl font-semibold text-gray-700 mt-4">
                Hola, espero que tengas un buen día
            </h1>
        </div>
    )
}
