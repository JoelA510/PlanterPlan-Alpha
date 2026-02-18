import DOMPurify from 'dompurify';

// Enforce security for external links (Tabnabbing protection)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node?.getAttribute && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

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
