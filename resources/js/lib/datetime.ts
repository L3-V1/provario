const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

/**
 * Formata uma data ISO no padrão dd/mm/yyyy HH:mm:ss.
 */
export function formatDateTime(
    value: string | Date | null | undefined,
): string {
    if (!value) {
        return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return formatter.format(date).replace(',', '');
}
