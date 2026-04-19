import { describe, it, expect } from 'vitest';
import { extractMentions } from '@/features/tasks/lib/comment-mentions';

describe('extractMentions (Wave 26)', () => {
    it('returns an empty array for an empty body', () => {
        expect(extractMentions('')).toEqual([]);
    });

    it('returns an empty array when there are no @-mentions', () => {
        expect(extractMentions('Hello world, no mentions here.')).toEqual([]);
    });

    it('extracts a single mention', () => {
        expect(extractMentions('Hey @alice take a look')).toEqual(['alice']);
    });

    it('extracts multiple mentions in first-occurrence order', () => {
        expect(extractMentions('@alice and @bob and @carol')).toEqual(['alice', 'bob', 'carol']);
    });

    it('deduplicates repeated mentions, keeping first occurrence', () => {
        expect(extractMentions('@alice @bob @alice @bob @alice')).toEqual(['alice', 'bob']);
    });

    it('trims trailing punctuation (`.`, `-`, `_`) from handles', () => {
        expect(extractMentions('hi @joe.')).toEqual(['joe']);
        expect(extractMentions('hi @joe_')).toEqual(['joe']);
        expect(extractMentions('hi @joe-')).toEqual(['joe']);
        expect(extractMentions('hi @joe..._-')).toEqual(['joe']);
    });

    it('preserves internal `.`, `-`, `_` in handles', () => {
        expect(extractMentions('@joe.smith and @mary-jane and @bob_y')).toEqual([
            'joe.smith',
            'mary-jane',
            'bob_y',
        ]);
    });

    it('lowercases all extracted handles', () => {
        expect(extractMentions('@Alice @BOB @CarolMarie')).toEqual(['alice', 'bob', 'carolmarie']);
    });

    it('handles adjacent `@@name` (captures the second one)', () => {
        expect(extractMentions('@@joe hello')).toEqual(['joe']);
    });

    it('returns an empty array when `@` is followed only by punctuation', () => {
        expect(extractMentions('email me @ hello @. @-')).toEqual([]);
    });

    it('works across multi-line bodies', () => {
        const body = ['First line mentions @alice.', '', 'Second paragraph mentions @bob and also @alice again.'].join('\n');
        expect(extractMentions(body)).toEqual(['alice', 'bob']);
    });
});
