import { useState, useCallback } from 'react';

export function useExpandedTasks(initialExpandedIds: string[] = []) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set(initialExpandedIds));

  const handleToggleExpand = useCallback((task: { id: string }, expanded: boolean) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
  }, []);

  return {
    expandedTaskIds,
    handleToggleExpand,
  };
}
