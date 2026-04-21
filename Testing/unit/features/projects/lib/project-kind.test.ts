import { describe, it, expect } from 'vitest';
import {
    applyProjectKind,
    extractProjectKind,
    formDataToProjectKind,
} from '@/features/projects/lib/project-kind';

describe('extractProjectKind (Wave 29)', () => {
    it('defaults to date when settings is null', () => {
        expect(extractProjectKind(null)).toBe('date');
    });

    it('defaults to date when settings is undefined', () => {
        expect(extractProjectKind(undefined)).toBe('date');
    });

    it('defaults to date when settings is present but key is absent', () => {
        expect(extractProjectKind({ settings: { published: true } })).toBe('date');
    });

    it('returns checkpoint when settings.project_kind = "checkpoint"', () => {
        expect(extractProjectKind({ settings: { project_kind: 'checkpoint' } })).toBe('checkpoint');
    });

    it('returns date when settings.project_kind = "date"', () => {
        expect(extractProjectKind({ settings: { project_kind: 'date' } })).toBe('date');
    });

    it('falls back to date for unrecognised values', () => {
        expect(extractProjectKind({ settings: { project_kind: 'foo' } })).toBe('date');
    });

    it('safely handles array-shaped settings', () => {
        expect(extractProjectKind({ settings: [] as unknown as Record<string, unknown> })).toBe('date');
    });
});

describe('formDataToProjectKind (Wave 29)', () => {
    it('returns null when the field is absent', () => {
        expect(formDataToProjectKind({})).toBe(null);
    });

    it('returns checkpoint for checkpoint', () => {
        expect(formDataToProjectKind({ project_kind: 'checkpoint' })).toBe('checkpoint');
    });

    it('returns date for date', () => {
        expect(formDataToProjectKind({ project_kind: 'date' })).toBe('date');
    });
});

describe('applyProjectKind (Wave 29)', () => {
    it('merges the kind into existing settings, preserving other keys', () => {
        const merged = applyProjectKind({ published: true, due_soon_threshold: 5 }, 'checkpoint');
        expect(merged).toEqual({ published: true, due_soon_threshold: 5, project_kind: 'checkpoint' });
    });

    it('returns the existing settings untouched when kind is null', () => {
        const merged = applyProjectKind({ published: true }, null);
        expect(merged).toEqual({ published: true });
    });

    it('returns undefined when there is nothing to persist (no kind, no settings)', () => {
        expect(applyProjectKind(null, null)).toBeUndefined();
        expect(applyProjectKind(undefined, null)).toBeUndefined();
        expect(applyProjectKind({}, null)).toBeUndefined();
    });

    it('writes project_kind onto empty settings', () => {
        expect(applyProjectKind(null, 'date')).toEqual({ project_kind: 'date' });
    });

    it('safely handles array-shaped input by starting fresh', () => {
        const merged = applyProjectKind([] as unknown as Record<string, unknown>, 'checkpoint');
        expect(merged).toEqual({ project_kind: 'checkpoint' });
    });
});
