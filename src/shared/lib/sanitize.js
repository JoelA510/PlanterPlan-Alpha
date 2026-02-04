import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML to prevent XSS attacks.
 * Allows safe HTML tags but strips scripts, iframes, and dangerous attributes.
 * 
 * @param {string} dirty - The dirty HTML string.
 * @returns {string} - The sanitized HTML string.
 */
export const sanitizeHTML = (dirty) => {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true }, // Aggressive default
        ADD_ATTR: ['target', 'rel'], // Allow safe link attributes
    });
};
