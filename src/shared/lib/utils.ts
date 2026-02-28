import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export const createPageUrl = (page: string | null | undefined): string => {
    if (!page) return '/';
    return page.startsWith('/') ? page : `/${page}`;
};
