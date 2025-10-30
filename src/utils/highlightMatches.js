const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getHighlightSegments = (text, query) => {
  const safeText = typeof text === 'string' ? text : '';
  const safeQuery = typeof query === 'string' ? query.trim() : '';

  if (!safeQuery) {
    return [{ text: safeText, isMatch: false }];
  }

  const regex = new RegExp(escapeRegExp(safeQuery), 'ig');
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(safeText)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      segments.push({
        text: safeText.slice(lastIndex, matchIndex),
        isMatch: false
      });
    }

    segments.push({
      text: match[0],
      isMatch: true
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (segments.length === 0) {
    return [{ text: safeText, isMatch: false }];
  }

  if (lastIndex < safeText.length) {
    segments.push({
      text: safeText.slice(lastIndex),
      isMatch: false
    });
  }

  return segments;
};

export default getHighlightSegments;
