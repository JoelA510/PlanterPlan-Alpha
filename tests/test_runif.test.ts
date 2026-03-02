import { describe, it, beforeAll } from 'vitest';

describe.runIf(false)('My Suite', () => {
    beforeAll(() => {
        console.log('BEFORE ALL RUNS EVEN IF FALSE?!');
    });
    it('my test', () => {
        console.log('TEST RUNS?');
    });
});
