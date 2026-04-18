import { describe, it, expect } from 'vitest';
import {
    scoreRelatedness,
    rankRelated,
} from '@/features/library/lib/related-templates';

describe('scoreRelatedness', () => {
    it('returns 0 when both sides are empty', () => {
        expect(scoreRelatedness({}, {})).toBe(0);
        expect(scoreRelatedness({ title: null, description: null }, { title: null, description: null })).toBe(0);
    });

    it('returns 0 when both sides are only stopwords', () => {
        expect(scoreRelatedness({ title: 'the a an and' }, { title: 'or of to for' })).toBe(0);
    });

    it('returns 0 for tokens shorter than the threshold', () => {
        // Every real token in both sides is 2 chars → below MIN_TOKEN_LENGTH, so dropped.
        expect(scoreRelatedness({ title: 'it is be' }, { title: 'on at as' })).toBe(0);
    });

    it('returns a positive score for title-only overlap', () => {
        const score = scoreRelatedness(
            { title: 'Launch grand opening service' },
            { title: 'Grand opening logistics' },
        );
        expect(score).toBeGreaterThan(0);
    });

    it('returns a positive score for description-only overlap', () => {
        const score = scoreRelatedness(
            { title: 'Alpha', description: 'Plan the launch service with worship leaders' },
            { title: 'Beta', description: 'Schedule worship leaders for the launch service' },
        );
        expect(score).toBeGreaterThan(0);
    });

    it('weights title overlap more heavily than description overlap', () => {
        const titleOverlap = scoreRelatedness(
            { title: 'grand opening service planning', description: 'completely unrelated wording' },
            { title: 'grand opening service planning', description: 'totally different subject matter' },
        );
        const descOverlap = scoreRelatedness(
            { title: 'completely unrelated wording', description: 'grand opening service planning' },
            { title: 'totally different subject matter', description: 'grand opening service planning' },
        );
        expect(titleOverlap).toBeGreaterThan(descOverlap);
    });

    it('is symmetric', () => {
        const a = { title: 'Launch grand opening service', description: 'service plan' };
        const b = { title: 'Grand opening logistics', description: 'service coordination' };
        expect(scoreRelatedness(a, b)).toBeCloseTo(scoreRelatedness(b, a), 10);
    });

    it('returns values bounded in [0, 1]', () => {
        const score = scoreRelatedness(
            { title: 'Prayer meeting outline', description: 'weekly prayer template' },
            { title: 'Prayer meeting outline', description: 'weekly prayer template' },
        );
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(1);
    });

    it('returns 1 when both sides are identical', () => {
        const input = { title: 'Prayer meeting outline', description: 'weekly prayer template' };
        expect(scoreRelatedness(input, input)).toBe(1);
    });
});

describe('rankRelated', () => {
    const seed = {
        id: 'seed',
        title: 'Launch grand opening service',
        description: 'Plan logistics for the grand opening service',
    };
    const candidates = [
        { id: 'a', title: 'Grand opening logistics', description: 'Rent venue and rehearse' },
        { id: 'b', title: 'Weekly volunteer meeting', description: 'Standing agenda for volunteers' },
        { id: 'c', title: 'Opening service run-sheet', description: 'Minute-by-minute opening plan' },
        { id: 'd', title: 'Budget reconciliation', description: 'Quarterly books cleanup' },
        { id: 'seed', title: 'Launch grand opening service', description: 'Plan logistics for the grand opening service' },
    ];

    it('excludes the seed id from results', () => {
        const ranked = rankRelated(seed, candidates, 10);
        expect(ranked.find((r) => r.id === 'seed')).toBeUndefined();
    });

    it('returns at most `limit` items', () => {
        expect(rankRelated(seed, candidates, 2).length).toBeLessThanOrEqual(2);
    });

    it('orders by score descending, breaking ties by title ascending', () => {
        const mk = (id: string, title: string) => ({
            id,
            title,
            description: 'grand opening service', // same text → same score
        });
        const tied = [mk('x', 'Zebra'), mk('y', 'Alpaca'), mk('z', 'Mongoose')];
        const ranked = rankRelated(
            { id: 'seed', title: 'grand opening service', description: 'grand opening service' },
            tied,
            10,
        );
        expect(ranked.map((r) => r.id)).toEqual(['y', 'z', 'x']); // Alpaca, Mongoose, Zebra
    });

    it('drops candidates whose score is 0 (no shared tokens)', () => {
        const ranked = rankRelated(seed, candidates, 10);
        // 'd' (Budget reconciliation, books cleanup) shares nothing with the seed.
        expect(ranked.find((r) => r.id === 'd')).toBeUndefined();
    });

    it('places the highest-scoring candidate first', () => {
        const ranked = rankRelated(seed, candidates, 10);
        expect(ranked[0]?.id).toBeDefined();
        // At least one of a, c should be the top hit — both share 'grand' / 'opening' / 'service' with the seed.
        expect(['a', 'c']).toContain(ranked[0]?.id);
    });

    it('handles an empty candidate list', () => {
        expect(rankRelated(seed, [])).toEqual([]);
    });

    it('handles a seed without an id (no self-exclusion needed)', () => {
        const { id: _ignored, ...seedNoId } = seed;
        void _ignored;
        const ranked = rankRelated(seedNoId, candidates, 10);
        // The candidate with id 'seed' has identical text, scores 1.0, and must appear.
        expect(ranked[0]?.id).toBe('seed');
    });
});
