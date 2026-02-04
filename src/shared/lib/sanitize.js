
import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string to safely render it.
 * @param {string} dirty - The potentially unsafe HTML string.
 * @returns {string} - The sanitized string.
 */
export const sanitizeHTML = (dirty) => {
    if (!dirty) return '';
    // Check if running in browser environment (DOMPurify needs window)
    // Or use JSDOM for server-side if needed, but this is a client app.
    // Standard DOMPurify works in browser.
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true }, // Only allow HTML
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'ul', 'li', 'ol'], // Allow basic formatting
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
};

/**
 * Sanitizes plain text to prevent HTML injection if rendered as HTML.
 * Actually, for plain text rendering in React {variable}, React auto-escapes.
 * But if we are using dangerouslySetInnerHTML, we must use sanitizeHTML.
 * If we are just rendering strings, we don't strictly *need* this unless we want to strip tags.
 */
export const stripTags = (dirty) => {
    if (!dirty) return '';
    return dirty.replace(/<[^>]*>?/gm, '');
}
