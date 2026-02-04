
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

    // Basic strict alphanumeric check, allowing underscores
    if (!/^[a-zA-Z0-9_]+$/.test(column)) {
        throw new Error('Invalid sort column format');
    }

    if (allowedColumns.length > 0 && !allowedColumns.includes(column)) {
        throw new Error(`Invalid sort column: ${column}`);
    }

    return column;
};
