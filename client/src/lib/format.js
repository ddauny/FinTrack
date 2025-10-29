export function formatEUR(value) {
    const num = Number(value ?? 0);
    try {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
    }
    catch {
        return `${num.toFixed(2)} €`;
    }
}
export function formatDateDMY(value) {
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}
export function formatDateMonthYear(value) {
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return '';
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
