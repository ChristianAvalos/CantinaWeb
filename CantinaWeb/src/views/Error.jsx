import { Player } from '@lottiefiles/react-lottie-player';

export default function Error() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-red-600">Acceso denegado</h1>
      <p className="text-xl text-gray-600">No tienes los privilegios adecuados para acceder a esta página.</p>
      
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

