import { describe, it, expect } from 'vitest';
import { calculateScheduleFromOffset, toIsoDate } from './index';
import type { Task } from '@/shared/db/app.types';

describe('date-engine', () => {
 describe('toIsoDate', () => {
 it('should format Date object to YYYY-MM-DD', () => {
 const date = new Date('2024-01-01T12:00:00Z');
 expect(toIsoDate(date)).toBe('2024-01-01');
 });

 it('should return string input if already YYYY-MM-DD', () => {
 expect(toIsoDate('2024-01-01')).toBe('2024-01-01');
 });

 it('should handle null/undefined gracefully', () => {
 expect(toIsoDate(null)).toBeNull();
 expect(toIsoDate(undefined)).toBeNull();
 });
 });

 describe('calculateScheduleFromOffset', () => {
 const mockTasks = [
 { id: 'root-1', start_date: '2024-01-01', parent_task_id: null },
 { id: 'phase-1', parent_task_id: 'root-1', start_date: '2024-01-01' },
 { id: 'task-1', parent_task_id: 'phase-1' },
 ] as Task[];

 it('should calculate dates based on root start date and offset', () => {
 const result = calculateScheduleFromOffset(mockTasks, 'phase-1', 10);
 expect(result).toHaveProperty('start_date', '2024-01-11');
 expect(result).toHaveProperty('due_date', '2024-01-11');
 });

 it('should return empty object if parent not found', () => {
 const result = calculateScheduleFromOffset(mockTasks, 'missing-id', 5);
 expect(result).toEqual({});
 });
 });
});
