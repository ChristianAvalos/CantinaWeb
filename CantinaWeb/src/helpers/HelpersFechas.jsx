// Función para convertir Date a YYYY-MM-DD
export function formatDateToInput(date) {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Mes va de 0 a 11
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

export function formatDateTimeToMinutes(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}
