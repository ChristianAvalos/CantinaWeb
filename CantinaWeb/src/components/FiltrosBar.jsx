import { useEffect, useState } from 'react';
import MonthPicker from './MonthPicker';
import PropTypes from 'prop-types';

const crearValoresIniciales = (filterDefinitions, initialValues) => {
    return filterDefinitions.reduce((accumulator, definition) => {
        if (Object.prototype.hasOwnProperty.call(initialValues, definition.key)) {
            accumulator[definition.key] = initialValues[definition.key];
            return accumulator;
        }

        if (definition.type === 'month') {
            accumulator[definition.key] = '';
            return accumulator;
        }

        if (definition.type === 'select' && definition.options?.length) {
            const selectedOption = definition.options.find((option) => option.selected === 'y');
            accumulator[definition.key] = selectedOption?.value ?? '';
            return accumulator;
        }

        accumulator[definition.key] = '';
        return accumulator;
    }, { ...initialValues });
};

const renderLabel = (label) => {
    if (!label) {
        return null;
    }

    return <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>;
};

export default function FiltrosBar({
    title,
    buttonLabel,
    onAdd,
    filterDefinitions = [],
    initialValues = {},
    onApply,
    className = '',
    defaultCollapsed = true,
}) {
    const [values, setValues] = useState(() => crearValoresIniciales(filterDefinitions, initialValues));
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    useEffect(() => {
        setValues(crearValoresIniciales(filterDefinitions, initialValues));
    }, [filterDefinitions, initialValues]);

    useEffect(() => {
        setIsCollapsed(defaultCollapsed);
    }, [defaultCollapsed]);

    const handleChange = (key, nextValue) => {
        setValues((previousValues) => ({
            ...previousValues,
            [key]: nextValue,
        }));
    };

    const handleApply = () => {
        if (typeof onApply === 'function') {
            onApply(values);
        }
    };

    const handleClear = () => {
        const valoresLimpios = crearValoresIniciales(filterDefinitions, initialValues);
        setValues(valoresLimpios);

        if (typeof onApply === 'function') {
            onApply(valoresLimpios);
        }
    };

    const renderFilter = (definition) => {
        const currentValue = values[definition.key] ?? '';

        if (definition.type === 'month') {
            return (
                <MonthPicker
                    key={definition.key}
                    value={currentValue}
                    onChange={(nextValue) => handleChange(definition.key, nextValue)}
                    label={definition.label}
                    className="mb-0 justify-start"
                />
            );
        }

        if (definition.type === 'date') {
            return (
                <label key={definition.key} className="block">
                    {renderLabel(definition.label)}
                    <input
                        type="date"
                        value={currentValue}
                        onChange={(event) => handleChange(definition.key, event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleApply();
                            }
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </label>
            );
        }

        if (definition.type === 'currency') {
            const valorFormateado = currentValue
                ? Number(currentValue).toLocaleString('es-PY')
                : '';

            return (
                <label key={definition.key} className="block">
                    {renderLabel(definition.label)}
                    <input
                        type="text"
                        inputMode="numeric"
                        value={valorFormateado}
                        placeholder={definition.placeholder ?? ''}
                        onChange={(event) => {
                            const soloNumeros = event.target.value.replace(/\D/g, '');
                            handleChange(definition.key, soloNumeros);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleApply();
                            }
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </label>
            );
        }

        if (definition.type === 'select') {
            return (
                <label key={definition.key} className="block">
                    {renderLabel(definition.label)}
                    <select
                        value={currentValue}
                        onChange={(event) => handleChange(definition.key, event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                        {definition.options?.map((option) => (
                            <option key={option.value ?? option.key} value={option.value ?? ''}>
                                {option.key ?? option.label ?? option.value}
                            </option>
                        ))}
                    </select>
                </label>
            );
        }

        return (
            <label key={definition.key} className="block">
                {renderLabel(definition.label)}
                <input
                    type={definition.type === 'number' ? 'number' : 'text'}
                    value={currentValue}
                    placeholder={definition.placeholder ?? ''}
                    onChange={(event) => handleChange(definition.key, event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            handleApply();
                        }
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
            </label>
        );
    };

    return (
        <div className={`rounded-3xl border border-slate-200 bg-white shadow-md ${className}`.trim()}>
            <div className="flex flex-col gap-3 rounded-t-3xl g360-gradient px-4 py-4 text-white md:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed((currentValue) => !currentValue)}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 lg:hidden"
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Ver filtros' : 'Ocultar filtros'}
                        title={isCollapsed ? 'Ver filtros' : 'Ocultar filtros'}
                    >
                        <img
                            src={isCollapsed ? '/img/Icon/filter.png' : '/img/Icon/filter-gear.png'}
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 object-contain"
                        />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed((currentValue) => !currentValue)}
                        className="hidden items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 lg:inline-flex"
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Ver filtros' : 'Ocultar filtros'}
                        title={isCollapsed ? 'Ver filtros' : 'Ocultar filtros'}
                    >
                        <img
                            src={isCollapsed ? '/img/Icon/filter.png' : '/img/Icon/filter-gear.png'}
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 object-contain"
                        />
                    </button>

                    {onAdd ? (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="rounded-2xl bg-white/15 px-4 py-2.5 font-bold text-white transition hover:bg-white/25"
                        >
                            {buttonLabel}
                        </button>
                    ) : null}
                </div>
            </div>

            {!isCollapsed ? (
                <>
                    <div className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-3 md:px-6">
                        {filterDefinitions.map(renderFilter)}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end md:px-6">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="rounded-2xl bg-slate-950/90 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-950"
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </>
            ) : null}
        </div>
    );
}

FiltrosBar.propTypes = {
    title: PropTypes.string.isRequired,
    buttonLabel: PropTypes.string,
    onAdd: PropTypes.func,
    filterDefinitions: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string,
        type: PropTypes.string.isRequired,
        placeholder: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.shape({
            key: PropTypes.string,
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            label: PropTypes.string,
            selected: PropTypes.string,
        })),
    })),
    initialValues: PropTypes.object,
    onApply: PropTypes.func,
    className: PropTypes.string,
    defaultCollapsed: PropTypes.bool,
};
