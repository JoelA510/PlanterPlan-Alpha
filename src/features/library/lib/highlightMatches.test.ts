import { describe, it, expect } from 'vitest';
import { getHighlightSegments } from './highlightMatches';

describe('getHighlightSegments', () => {
  it('highlights a single match', () => {
    const result = getHighlightSegments('hello world', 'world');
    expect(result).toEqual([
      { text: 'hello ', isMatch: false },
      { text: 'world', isMatch: true },
    ]);
  });

  it('highlights multiple matches', () => {
    const result = getHighlightSegments('foo bar foo', 'foo');
    expect(result).toEqual([
      { text: 'foo', isMatch: true },
      { text: ' bar ', isMatch: false },
      { text: 'foo', isMatch: true },
    ]);
  });

  it('matches case insensitively', () => {
    const result = getHighlightSegments('Hello HELLO hello', 'hello');
    expect(result).toHaveLength(5); // 3 matches + 2 separators
    expect(result.filter(s => s.isMatch)).toHaveLength(3);
  });

  it('returns full text as non-match when no match found', () => {
    const result = getHighlightSegments('hello world', 'xyz');
    expect(result).toEqual([{ text: 'hello world', isMatch: false }]);
  });

  it('returns full text as non-match for empty query', () => {
    const result = getHighlightSegments('hello', '');
    expect(result).toEqual([{ text: 'hello', isMatch: false }]);
  });

  it('returns empty text for null text input', () => {
    const result = getHighlightSegments(null, 'test');
    expect(result).toEqual([{ text: '', isMatch: false }]);
  });

  it('handles special regex characters in query', () => {
    const result = getHighlightSegments('price is $10.00', '$10.00');
    expect(result).toEqual([
      { text: 'price is ', isMatch: false },
      { text: '$10.00', isMatch: true },
    ]);
  });

  it('handles match at start of text', () => {
    const result = getHighlightSegments('hello world', 'hello');
    expect(result[0]).toEqual({ text: 'hello', isMatch: true });
    expect(result[1]).toEqual({ text: ' world', isMatch: false });
  });

  it('handles match at end of text', () => {
    const result = getHighlightSegments('hello world', 'world');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ text: 'world', isMatch: true });
  });

  it('handles null query', () => {
    const result = getHighlightSegments('hello', null);
    expect(result).toEqual([{ text: 'hello', isMatch: false }]);
  });

  it('returns no highlights for whitespace-only query', () => {
    const result = getHighlightSegments('hello world', '   ');
    expect(result).toEqual([{ text: 'hello world', isMatch: false }]);
  });
});
