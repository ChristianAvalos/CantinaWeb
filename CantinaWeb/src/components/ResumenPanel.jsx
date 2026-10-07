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
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 26,
                    },
                    {
                        label: 'Compras',
                        data: serie.map((punto) => punto.compras),
                        backgroundColor: COLOR_COMPRAS,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 26,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 16,
                            color: '#475569',
                            font: { size: 12, weight: '600' },
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        padding: 10,
                        cornerRadius: 8,
                        usePointStyle: true,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${formatearMonto(context.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#64748b' },
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.18)',
                            drawTicks: false,
                        },
                        border: { display: false },
                        ticks: {
                            color: '#64748b',
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
        { titulo: 'Ventas del mes', valor: formatearMonto(ventasMes), icono: 'fas fa-cash-register', acento: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' },
        { titulo: 'Compras del mes', valor: formatearMonto(comprasMes), icono: 'fas fa-truck-loading', acento: 'text-rose-600', chip: 'bg-rose-100 text-rose-700' },
        { titulo: 'Saldo del mes', valor: formatearMonto(saldoMes), icono: 'fas fa-coins', acento: saldoMes < 0 ? 'text-orange-600' : 'text-sky-600', chip: saldoMes < 0 ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700' },
        { titulo: 'Por cobrar (ventas a crédito)', valor: `${resumen?.cobranzasPendientes ?? 0} · ${formatearMonto(resumen?.cobranzasPendientesMonto)}`, icono: 'fas fa-hand-holding-dollar', acento: 'text-teal-600', chip: 'bg-teal-100 text-teal-700' },
        { titulo: 'Por pagar (compras a crédito)', valor: `${resumen?.pagosPendientes ?? 0} · ${formatearMonto(resumen?.pagosPendientesMonto)}`, icono: 'fas fa-file-invoice-dollar', acento: 'text-red-600', chip: 'bg-red-100 text-red-700' },
    ];

    return (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {/* Resúmenes del mes */}
            <div className="mb-5 flex flex-wrap gap-4">
                {tarjetas.map((tarjeta) => (
                    <div
                        key={tarjeta.titulo}
                        className="flex flex-1 basis-[210px] items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tarjeta.titulo}</p>
                            <h3 className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${tarjeta.acento}`}>{tarjeta.valor}</h3>
                        </div>
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tarjeta.chip}`}>
                            <i className={tarjeta.icono} />
                        </span>
                    </div>
                ))}
            </div>

            <hr className="mb-4 border-slate-200" />

            {/* Encabezado y selector de mes */}
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-slate-700">Ventas vs. Compras (últimos 6 meses)</h3>
                <MonthPicker value={mesSeleccionado} onChange={handleMesChange} label="" className="mb-0" />
            </div>

            <div className="h-80 w-full">
                {ChartModule ? (
                    <canvas ref={canvasRef}></canvas>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                        Cargando gráfico...
                    </div>
                )}
            </div>
        </div>
    );
}
