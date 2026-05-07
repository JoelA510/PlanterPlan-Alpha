import * as React from 'react';

export interface ConfirmDialogOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    /** When true, the confirm button is rendered in a destructive color scheme. */
    destructive?: boolean;
}

export const ConfirmDialogContext = React.createContext<
    ((options: ConfirmDialogOptions) => Promise<boolean>) | null
>(null);

export function useConfirm() {
    const ctx = React.useContext(ConfirmDialogContext);
    if (!ctx) {
        throw new Error('useConfirm must be used inside <ConfirmDialogProvider>');
    }
    return ctx;
}
