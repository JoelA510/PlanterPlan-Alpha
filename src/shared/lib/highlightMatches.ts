/** A segment of text with match metadata for highlighting. */
export interface HighlightSegment {
    text: string;
    isMatch: boolean;
}

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits `text` into segments, marking substrings that match `query`.
 * Used for search-result highlighting in the UI.
 */
export const getHighlightSegments = (
    text: string | null | undefined,
    query: string | null | undefined,
): HighlightSegment[] => {
    const safeText = typeof text === 'string' ? text : '';
    const safeQuery = typeof query === 'string' ? query.trim() : '';

    if (!safeQuery) {
        return [{ text: safeText, isMatch: false }];
    }

    const regex = new RegExp(escapeRegExp(safeQuery), 'ig');
    const segments: HighlightSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(safeText)) !== null) {
        const matchIndex = match.index;

        if (matchIndex > lastIndex) {
            segments.push({
                text: safeText.slice(lastIndex, matchIndex),
                isMatch: false,
            });
        }

        segments.push({
            text: match[0],
            isMatch: true,
        });

        lastIndex = matchIndex + match[0].length;
    }

    if (segments.length === 0) {
        return [{ text: safeText, isMatch: false }];
    }

    if (lastIndex < safeText.length) {
        segments.push({
            text: safeText.slice(lastIndex),
            isMatch: false,
        });
    }

    return segments;
};

export default getHighlightSegments;
