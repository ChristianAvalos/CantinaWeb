export default function Spinner() {
    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                </div>
                <p className="text-white mt-4">Cargando...</p>
            </div>
        </div>
    );
}
