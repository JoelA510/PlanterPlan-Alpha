import { describe, it, expect } from 'vitest';
import {
    extractStrategyTemplateFlag,
    formDataToStrategyTemplateFlag,
    applyStrategyTemplateFlag,
} from '@/features/tasks/lib/strategy-form';
import type { TaskFormData, TaskRow } from '@/shared/db/app.types';

describe('strategy-form.extractStrategyTemplateFlag', () => {
    it('returns false for null / undefined task', () => {
        expect(extractStrategyTemplateFlag(null)).toBe(false);
        expect(extractStrategyTemplateFlag(undefined)).toBe(false);
    });

    it('returns false when settings is missing or non-object', () => {
        expect(extractStrategyTemplateFlag({} as Partial<TaskRow>)).toBe(false);
        expect(extractStrategyTemplateFlag({ settings: null } as Partial<TaskRow>)).toBe(false);
        expect(
            extractStrategyTemplateFlag({ settings: [] as unknown as TaskRow['settings'] } as Partial<TaskRow>),
        ).toBe(false);
    });

    it('returns false when the flag is absent or non-true', () => {
        expect(
            extractStrategyTemplateFlag({ settings: {} as TaskRow['settings'] } as Partial<TaskRow>),
        ).toBe(false);
        expect(
            extractStrategyTemplateFlag({
                settings: { is_strategy_template: false } as unknown as TaskRow['settings'],
            } as Partial<TaskRow>),
        ).toBe(false);
        expect(
            extractStrategyTemplateFlag({
                settings: { is_strategy_template: 'true' } as unknown as TaskRow['settings'],
            } as Partial<TaskRow>),
        ).toBe(false);
    });

    it('returns true only when the flag is strictly true', () => {
        expect(
            extractStrategyTemplateFlag({
                settings: { is_strategy_template: true } as unknown as TaskRow['settings'],
            } as Partial<TaskRow>),
        ).toBe(true);
    });
});

describe('strategy-form.formDataToStrategyTemplateFlag', () => {
    it('returns null when the field was never rendered (undefined)', () => {
        const data = {} as TaskFormData;
        expect(formDataToStrategyTemplateFlag(data)).toBeNull();
    });

    it('returns true / false per the boolean field value', () => {
        expect(formDataToStrategyTemplateFlag({ is_strategy_template: true } as TaskFormData)).toBe(true);
        expect(formDataToStrategyTemplateFlag({ is_strategy_template: false } as TaskFormData)).toBe(false);
    });
});

describe('strategy-form.applyStrategyTemplateFlag', () => {
    it('returns undefined when flag is null and there are no existing settings', () => {
        expect(applyStrategyTemplateFlag(null, null)).toBeUndefined();
        expect(applyStrategyTemplateFlag(undefined, null)).toBeUndefined();
        expect(applyStrategyTemplateFlag({}, null)).toBeUndefined();
    });

    it('preserves existing settings when flag is null and settings are non-empty', () => {
        const existing = { recurrence: { kind: 'weekly' }, is_coaching_task: true };
        const result = applyStrategyTemplateFlag(existing, null);
        expect(result).toEqual(existing);
        // should be a shallow copy, not the same reference
        expect(result).not.toBe(existing);
    });

    it('sets the flag when true, preserving other keys', () => {
        const existing = { recurrence: { kind: 'monthly' }, is_coaching_task: true };
        expect(applyStrategyTemplateFlag(existing, true)).toEqual({
            recurrence: { kind: 'monthly' },
            is_coaching_task: true,
            is_strategy_template: true,
        });
    });

    it('deletes the flag when false, preserving other keys', () => {
        const existing = {
            recurrence: { kind: 'weekly' },
            is_coaching_task: true,
            is_strategy_template: true,
        };
        expect(applyStrategyTemplateFlag(existing, false)).toEqual({
            recurrence: { kind: 'weekly' },
            is_coaching_task: true,
        });
    });

    it('chains safely after applyCoachingFlag output', () => {
        // Simulates the Project.tsx / TaskList.tsx merge order.
        const afterCoaching = { recurrence: { kind: 'weekly' }, is_coaching_task: true };
        expect(applyStrategyTemplateFlag(afterCoaching, true)).toEqual({
            recurrence: { kind: 'weekly' },
            is_coaching_task: true,
            is_strategy_template: true,
        });
    });

    it('treats arrays and non-objects as empty settings', () => {
        expect(
            applyStrategyTemplateFlag([] as unknown as Record<string, unknown>, true),
        ).toEqual({ is_strategy_template: true });
    });
});
