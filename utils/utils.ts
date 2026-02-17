export function convertBase64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf-8');
}

export function convertStringToBase64(val: string): string {
    return Buffer.from(val, 'utf-8').toString('base64');
}

export function isEmpty(list: any[]): boolean {
    return list.length === 0;
}

export function isNotEmpty(list: any[]): boolean {
    return list.length > 0;
}

export function isNull(value: any): boolean {
    return value === null;
}

export function isNotNull(value: any): boolean {
    return value !== null;
}