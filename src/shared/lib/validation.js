import { z } from 'zod';

/**
 * Validates that a sort column is a safe, allowed identifier.
 * Prevents SQL injection via dynamic sort parameters.
 * @param {string} column - The column name to validate.
 * @param {string[]} allowedColumns - Array of allowed column names.
 * @returns {string} - The validated column name.
 * @throws {Error} - If the column is invalid.
 */
export const validateSortColumn = (column, allowedColumns = []) => {
    if (!column) return null;

    // Define base schema for safe SQL identifiers (alphanumeric + underscore)
    const baseSchema = z.string().regex(/^[a-zA-Z0-9_]+$/, 'Invalid sort column format');

    try {
        // Validate format first
        const validFormat = baseSchema.parse(column);

        // Validate allowlist if provided
        if (allowedColumns.length > 0) {
            const enumSchema = z.enum(allowedColumns);
            // We use the already validated formatted string, but check it against enum
            // Using safeParse for custom error message similar to original
            const result = enumSchema.safeParse(validFormat);
            if (!result.success) {
                throw new Error(`Invalid sort column: ${column}`);
            }
        }

        return validFormat;
    } catch (error) {
        // preserve original error messages for compatibility or re-throw Zod errors
        if (error instanceof z.ZodError) {
            throw new Error(error.issues[0].message);
        }
        throw error;
    }
};
