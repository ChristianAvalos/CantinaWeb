import React from 'react';

export default function Alerta({ tipo = 'informativo', mensaje, onClose, onConfirm }) {
    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black bg-opacity-50 z-[1050]">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full">
                <p className="text-gray-800 mb-4">{mensaje}</p>

                {tipo === 'confirmacion' ? (
                    <div className="flex justify-between">
                        <button
                            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                            onClick={onConfirm}
                        >
                            Sí
                        </button>
                        <button
                            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
                            onClick={onClose}
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                )}
            </div>
        </div>
    );
}
