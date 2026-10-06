import { useEffect, useRef, useState } from 'react';
import { formatearGuarani } from '../helpers/HelpersNumeros';
import MonthPicker from './MonthPicker';

const COLOR_VENTAS = '#16a34a';
const COLOR_COMPRAS = '#dc2626';

const formatearMonto = (valor) => `${formatearGuarani(valor ?? 0)} gs.`;

/**
 * Resumen de dinero del mes seleccionado y comparativa de los últimos 6 meses.
 *
 * Compra = egreso (sale dinero) y Venta = ingreso (entra dinero), por lo que el
 * saldo del mes es `ventas - compras`. Los datos ya vienen acotados a la
 * organización (y sucursal) del usuario desde el backend.
 */
export default function ResumenPanel({ resumen, mesSeleccionado, handleMesChange }) {
    const [ChartModule, setChartModule] = useState(null);
    const canvasRef = useRef(null);
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
        const serie = resumen?.serie ?? [];

        if (!ChartModule || !canvasRef.current) {
            return undefined;
        }

        chartRef.current?.destroy();
        chartRef.current = new ChartModule(canvasRef.current, {
            type: 'bar',
            data: {
                labels: serie.map((punto) => punto.label),
                datasets: [
                    {
                        label: 'Ventas',
                        data: serie.map((punto) => punto.ventas),
                        backgroundColor: COLOR_VENTAS,
                        borderRadius: 4,
                    },
                    {
                        label: 'Compras',
                        data: serie.map((punto) => punto.compras),
                        backgroundColor: COLOR_COMPRAS,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${formatearMonto(context.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (valor) => formatearGuarani(valor),
                        },
                    },
                },
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [ChartModule, resumen]);

    const ventasMes = resumen?.ventasMes ?? 0;
    const comprasMes = resumen?.comprasMes ?? 0;
    const saldoMes = resumen?.saldoMes ?? 0;

    const tarjetas = [
        { titulo: 'Ventas del mes', valor: formatearMonto(ventasMes), icono: 'fas fa-cash-register', color: 'bg-green-600' },
        { titulo: 'Compras del mes', valor: formatearMonto(comprasMes), icono: 'fas fa-truck-loading', color: 'bg-red-600' },
        { titulo: 'Saldo del mes', valor: formatearMonto(saldoMes), icono: 'fas fa-coins', color: saldoMes < 0 ? 'bg-orange-500' : 'bg-sky-600' },
        { titulo: 'Por cobrar (ventas a crédito)', valor: `${resumen?.cobranzasPendientes ?? 0} · ${formatearMonto(resumen?.cobranzasPendientesMonto)}`, icono: 'fas fa-hand-holding-dollar', color: 'bg-teal-600' },
        { titulo: 'Por pagar (compras a crédito)', valor: `${resumen?.pagosPendientes ?? 0} · ${formatearMonto(resumen?.pagosPendientesMonto)}`, icono: 'fas fa-file-invoice-dollar', color: 'bg-rose-600' },
    ];

    return (
        <div className="w-full bg-white rounded-lg shadow-md p-4 sm:p-5">
            {/* Resúmenes del mes */}
            <div className="flex flex-wrap gap-4 mb-5">
                {tarjetas.map((tarjeta) => (
                    <div
                        key={tarjeta.titulo}
                        className={`${tarjeta.color} rounded-lg p-4 shadow-sm flex-1 basis-[190px] flex items-center justify-between`}
                    >
                        <div>
                            <p className="text-white text-sm">{tarjeta.titulo}</p>
                            <h3 className="text-white text-lg sm:text-xl font-bold">{tarjeta.valor}</h3>
                        </div>
                        <div className="text-white text-2xl ml-4">
                            <i className={tarjeta.icono} />
                        </div>
                    </div>
                ))}
            </div>

            <hr className="border-gray-300 mb-4" />

            {/* Encabezado y selector de mes */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <h3 className="font-bold text-lg text-gray-700">Ventas vs. Compras (últimos 6 meses)</h3>
                <MonthPicker value={mesSeleccionado} onChange={handleMesChange} label="" className="mb-0" />
            </div>

            <div className="h-80 w-full">
                {ChartModule ? (
                    <canvas ref={canvasRef}></canvas>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                        Cargando gráfico...
                    </div>
                )}
            </div>
        </div>
    );
}
