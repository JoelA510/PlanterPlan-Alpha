import { TASK_STATUS } from '@/app/constants/index';

test('TASK_STATUS exists', () => {
  expect(TASK_STATUS).toBeDefined();
  expect(TASK_STATUS.TODO).toBe('todo');
});
