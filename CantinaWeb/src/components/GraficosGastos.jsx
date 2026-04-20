import { useEffect, useRef, useState } from 'react';
import { formatearGuarani } from '../helpers/HelpersNumeros';

const GraficoGastos = ({ datos, restante, acumulado, ingresoMes, egresoMes, mesSeleccionado, handleMesChange }) => {
    const [ChartModule, setChartModule] = useState(null);
    const canvasRef = useRef(null);
    const inputRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        import('chart.js/auto').then(({ default: Chart }) => {
            if (!cancelled) {
                setChartModule(() => Chart);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!ChartModule || !canvasRef.current) {
            return undefined;
        }

        const categorias = datos.map(d => d.categoria);
        const montos = datos.map(d => d.monto);
        const colores = datos.map(d => d.color);

        chartRef.current?.destroy();
        chartRef.current = new ChartModule(canvasRef.current, {
            type: 'doughnut',
            data: {
                labels: [...categorias, 'Restante'],
                datasets: [{
                    data: [...montos, restante],
                    backgroundColor: [...colores, '#CCCCCC'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                }
            }
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [ChartModule, datos, restante]);

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-4">
            {/* Resúmenes */}
            <div className="flex flex-wrap gap-4 mb-4 justify-center">
                <div className="bg-green-500 rounded-lg p-4 shadow-md basis-[200px] flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">Saldo del mes</p>
                        <h3 className="text-white text-xl font-bold">{formatearGuarani(restante)}</h3>
                    </div>
                    <div className="text-white text-2xl ml-4">
                        <i className="fas fa-coins" />
                    </div>
                </div>
                <div className="bg-sky-500 rounded-lg p-4 shadow-md basis-[200px] flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">Acumulado</p>
                        <h3 className="text-white text-xl font-bold">{formatearGuarani(acumulado)}</h3>
                    </div>
                    <div className="text-white text-2xl ml-4">
                        <i className="fas fa-coins" />
                    </div>
                </div>

                <div className="bg-yellow-400 rounded-lg p-4 shadow-md basis-[200px] flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">Ingreso del mes</p>
                        <h3 className="text-white text-xl font-bold">{formatearGuarani(ingresoMes)}</h3>
                    </div>
                    <div className="text-white text-2xl ml-4">
                        <i className="fas fa-coins" />
                    </div>
                </div>

                <div className="bg-red-500 rounded-lg p-4 shadow-md basis-[200px] flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm">Egresos del mes</p>
                        <h3 className="text-white text-xl font-bold">{formatearGuarani(egresoMes)}</h3>
                    </div>
                    <div className="text-white text-2xl ml-4">
                        <i className="fas fa-coins" />
                    </div>
                </div>

            </div>
            <hr className="border-gray-300 mb-4" />
            {/* Encabezado y selector de mes */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <h3 className="font-bold text-lg text-gray-700">Gastos por Categoría</h3>
                <div className="relative">
                    <input
                        type="month"
                        ref={inputRef}
                        value={mesSeleccionado}
                        onChange={handleMesChange}
                        className="border rounded px-2 py-1 pr-8"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                        onClick={() => {
                            if (inputRef.current) {
                                if (inputRef.current.showPicker) {
                                    inputRef.current.showPicker();
                                } else {
                                    inputRef.current.focus();
                                }
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </span>
                </div>
            </div>
            <hr className="border-gray-300 mb-4" />
            {/* Gráfico */}
            <div className="w-full flex justify-center">
                <div className="w-full sm:w-2/3 md:w-1/2">
                    {ChartModule ? (
                        <canvas ref={canvasRef}></canvas>
                    ) : (
                        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                            Cargando grafico...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GraficoGastos;
