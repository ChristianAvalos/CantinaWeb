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

export function formatearGuarani(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';

    let numero = Number(valor);

    if (isNaN(numero)) return '';

    // Redondear al entero más cercano
    numero = Math.round(numero);

    return numero.toLocaleString('es-PY');
}



