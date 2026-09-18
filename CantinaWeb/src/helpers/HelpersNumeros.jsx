export function formatearMiles(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';

    const valorStr = valor.toString();

    // Expresión regular para detectar un RUC con guion al final (ej. 1234567-8)
    const rucConGuionRegex = /^(\d{1,3}(?:\.\d{3})*)-\d$/;

    if (valorStr.includes('-')) {
        // Es un RUC con guion
        const partes = valorStr.split('-');
        const parteNumerica = partes[0];
        const digitoVerificador = partes[1];

        // Limpiamos los puntos para la conversión a número
        const numParteNumerica = parseInt(parteNumerica.replace(/\./g, ''));

        if (isNaN(numParteNumerica)) {
            return valorStr; // Si no es un número válido, devolvemos el original
        }

        // Formateamos la parte numérica y luego añadimos el guion y el dígito verificador
        return `${new Intl.NumberFormat('es-PY').format(numParteNumerica)}-${digitoVerificador}`;
    } else {
        // Es un CI o un número sin guion

        // Primero, limpiamos cualquier formato existente (puntos) para obtener el número puro
        const numeroLimpioStr = valorStr.replace(/\./g, '');
        const num = parseInt(numeroLimpioStr);

        if (isNaN(num)) {
            // Si no es un número válido, devolvemos el valor original
            return valorStr;
        }

        if (numeroLimpioStr.length >= 4) {
            return new Intl.NumberFormat('es-PY').format(num);
        } else {
            return num.toString(); // Para 3 dígitos o menos, no queremos puntos (ej. 125)
        }
    }
}

export function limpiarFormato(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';
    return valor.toString().replace(/\./g, '').replace(/-/g, '');
}

/**
 * Calcula el dígito verificador de un RUC paraguayo (módulo 11).
 * Pesos 2..9 (ciclo) aplicados de derecha a izquierda sobre la base del RUC.
 * Regla: resto 0 -> DV 0, resto 1 -> DV 1, resto >= 2 -> DV = 11 - resto.
 * @param {string|number} base RUC sin el dígito verificador (ej. 5291959)
 * @returns {number|null} dígito verificador (0-9) o null si no hay dígitos
 */
export function calcularDigitoVerificadorRuc(base) {
    const digitos = (base === '' || base === null || base === undefined)
        ? ''
        : base.toString().split('-')[0].replace(/\D/g, '');

    if (digitos === '') return null;

    let suma = 0;
    let peso = 2;

    for (let i = digitos.length - 1; i >= 0; i--) {
        suma += Number(digitos[i]) * peso;
        peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = suma % 11;

    return (resto === 0 || resto === 1) ? resto : 11 - resto;
}

/**
 * Formatea un RUC paraguayo SIN separador de miles: <base>-<dígito verificador>.
 * El dígito verificador SIEMPRE se calcula (módulo 11), por lo que la base puede
 * tener cualquier cantidad de dígitos: 5291959 -> 5291959-5, 80012345 -> 80012345-1.
 * @param {string|number} valor RUC o base del RUC (con o sin guion)
 * @returns {string}
 */
export function formatearRuc(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';

    // La base son los dígitos anteriores al guion (la base del RUC tiene hasta 8 dígitos)
    const base = valor.toString().trim().split('-')[0].replace(/\D/g, '').slice(0, 8);
    if (base === '') return '';

    const digitoVerificador = calcularDigitoVerificadorRuc(base);

    return digitoVerificador === null ? base : `${base}-${digitoVerificador}`;
}

/**
 * Aplica el formato correspondiente a un documento según el `formato` definido
 * en el catálogo de tipos de documento (BD): 'ruc', 'miles' o 'libre'.
 * @param {string|number} valor
 * @param {string} formato
 * @returns {string}
 */
export function formatearPorFormato(valor, formato) {
    switch (formato) {
        case 'ruc':
            return formatearRuc(valor);
        case 'miles':
            return formatearMiles(valor);
        default:
            return valor === '' || valor === null || valor === undefined ? '' : valor.toString();
    }
}

/**
 * Indica si un formato de documento corresponde a RUC.
 * @param {string} formato
 * @returns {boolean}
 */
export function esFormatoRuc(formato) {
    return (formato || '').toString().trim().toLowerCase() === 'ruc';
}

export function formatearGuarani(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';

    let numero = Number(valor);

    if (isNaN(numero)) return '';

    // Redondear al entero más cercano
    numero = Math.round(numero);

    return numero.toLocaleString('es-PY');
}

export function formatearDecimalSinCeros(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';
    const s = String(valor).trim();

    // Determinar cuál es el separador decimal observando la última aparición
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    let normalized = s;

    if (lastDot > lastComma) {
        // El punto aparece más tarde -> punto como separador decimal
        normalized = s.replace(/,/g, '');
    } else if (lastComma > lastDot) {
        // La coma aparece más tarde -> coma como separador decimal
        normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
        // Sólo un tipo o ninguno
        if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
            // Sólo comas: asumir coma decimal si hay una sola coma y pocos decimales
            const parts = s.split(',');
            if (parts.length === 2 && parts[1].length <= 3) {
                normalized = s.replace(',', '.');
            } else {
                normalized = s.replace(/,/g, '');
            }
        } else {
            // Ningún separador o sólo puntos -> eliminar comas si las hay
            normalized = s.replace(/,/g, '');
        }
    }

    const n = Number(normalized);
    if (Number.isNaN(n)) return s;
    if (Number.isInteger(n)) return n.toString();

    // Para decimales: eliminar ceros finales innecesarios
    let str = n.toString();
    if (str.indexOf('.') !== -1) {
        str = str.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
    }
    return str;
}



