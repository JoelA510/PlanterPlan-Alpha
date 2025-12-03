import { getHighlightSegments } from './highlightMatches';

describe('getHighlightSegments', () => {
  it('returns original text when query is empty', () => {
    const segments = getHighlightSegments('Alpha Beta', '');
    expect(segments).toEqual([{ text: 'Alpha Beta', isMatch: false }]);
  });

  it('highlights matching substrings case-insensitively', () => {
    const segments = getHighlightSegments('Master Task Alpha', 'task');
    expect(segments).toEqual([
      { text: 'Master ', isMatch: false },
      { text: 'Task', isMatch: true },
      { text: ' Alpha', isMatch: false },
    ]);
  });

  it('handles multiple occurrences', () => {
    const segments = getHighlightSegments('Plan task, task again', 'task');
    expect(segments).toEqual([
      { text: 'Plan ', isMatch: false },
      { text: 'task', isMatch: true },
      { text: ', ', isMatch: false },
      { text: 'task', isMatch: true },
      { text: ' again', isMatch: false },
    ]);
  });

  it('returns single segment when no matches found', () => {
    const segments = getHighlightSegments('Alpha Beta', 'Gamma');
    expect(segments).toEqual([{ text: 'Alpha Beta', isMatch: false }]);
  });
});
