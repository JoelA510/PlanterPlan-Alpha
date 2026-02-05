import { describe, it, expect } from 'vitest';
import { validateSortColumn } from './validation';

describe('validateSortColumn', () => {
    it('should return null for empty input', () => {
        expect(validateSortColumn(null)).toBeNull();
        expect(validateSortColumn(undefined)).toBeNull();
        expect(validateSortColumn('')).toBeNull();
    });

    it('should validate allowed alphanumeric columns', () => {
        expect(validateSortColumn('created_at')).toBe('created_at');
        expect(validateSortColumn('title')).toBe('title');
        expect(validateSortColumn('priority_level')).toBe('priority_level');
    });

    it('should throw error for invalid formats (injection attempts)', () => {
        expect(() => validateSortColumn('title; DROP TABLE users')).toThrow('Invalid sort column format');
        expect(() => validateSortColumn('title--')).toThrow('Invalid sort column format');
        expect(() => validateSortColumn('id OR 1=1')).toThrow('Invalid sort column format');
    });

    it('should enforce allowedColumns allowlist if provided', () => {
        const allowed = ['title', 'created_at', 'status'];
        expect(validateSortColumn('title', allowed)).toBe('title');
        expect(() => validateSortColumn('description', allowed)).toThrow('Invalid sort column: description');
    });
});
