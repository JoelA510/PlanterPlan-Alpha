// TaskList.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemType = 'TASK';

// Recursive component to render a task with drag/drop and completion checkbox
function TaskItem({ task, level, moveTask, updateParent, toggleComplete }) {
  const ref = useRef(null);

  // Drag logic
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: task.id, parent: task.parent_task_id, position: task.position },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop logic
  const [, drop] = useDrop({
    accept: ItemType,
    drop(item, monitor) {
      if (task.id !== item.id && task.id !== item.parent) {
        updateParent(item.id, task.id);
      }
    },
    hover(item, monitor) {
      if (item.parent === task.parent_task_id) {
        const dragIndex = item.position;
        const hoverIndex = task.position;
        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

        moveTask(item.id, task.id);
        item.position = hoverIndex;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`border border-gray-300 bg-white rounded p-2 mb-2 transition-shadow ${
        isDragging ? 'opacity-50' : 'shadow-sm'
      }`}
      style={{ marginLeft: level * 20 }}
    >
      <div className="flex items-center">
        {/* Drag handle */}
        <span className="text-gray-400 cursor-move mr-2">&#8942;</span>

        {/* Completion Checkbox */}
        <input
          type="checkbox"
          checked={task.is_complete}
          onChange={() => toggleComplete(task)}
          className="mr-2 cursor-pointer"
        />

        {/* Task Title */}
        <span
          className={`${
            task.is_complete ? 'line-through text-gray-500' : 'text-gray-800'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Render children recursively */}
      {task.children && task.children.length > 0 && (
        <div className="mt-1 pl-4 border-l-2 border-gray-200">
          {task.children.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              level={level + 1}
              moveTask={moveTask}
              updateParent={updateParent}
              toggleComplete={toggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to build a nested tree from a flat list
function buildTaskTree(tasks) {
  const taskMap = {};
  tasks.forEach((task) => {
    task.children = [];
    taskMap[task.id] = task;
  });
  const rootTasks = [];

  tasks.forEach((task) => {
    if (task.parent_task_id) {
      if (taskMap[task.parent_task_id]) {
        taskMap[task.parent_task_id].children.push(task);
      }
    } else {
      rootTasks.push(task);
    }
  });

  // Sort each level by position
  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.position - b.position);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(rootTasks);
  return rootTasks;
}

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch instance tasks
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('origin', 'instance')
        .order('position', { ascending: true });
      if (error) console.error('Error fetching tasks:', error);
      else setTasks(data);
      setLoading(false);
    }
    fetchTasks();
  }, []);

  // Toggle completion status
  const toggleComplete = async (task) => {
    const updatedValue = !task.is_complete;
    const { error } = await supabase
      .from('tasks')
      .update({ is_complete: updatedValue })
      .eq('id', task.id);
    if (error) {
      console.error('Error updating task:', error);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_complete: updatedValue } : t))
      );
    }
  };

  // Reorder tasks among siblings
  const moveTask = async (dragId, hoverId) => {
    const updated = [...tasks];
    const dragTask = updated.find((t) => t.id === dragId);
    const hoverTask = updated.find((t) => t.id === hoverId);
    if (!dragTask || !hoverTask) return;
    if (dragTask.parent_task_id !== hoverTask.parent_task_id) return;

    const temp = dragTask.position;
    dragTask.position = hoverTask.position;
    hoverTask.position = temp;
    setTasks(updated);

    const { error: err1 } = await supabase
      .from('tasks')
      .update({ position: dragTask.position })
      .eq('id', dragTask.id);
    const { error: err2 } = await supabase
      .from('tasks')
      .update({ position: hoverTask.position })
      .eq('id', hoverTask.id);

    if (err1 || err2) {
      console.error('Error updating positions:', err1, err2);
    }
  };

  // Update the parent of a dragged task
  const updateParent = async (dragId, newParentId) => {
    const updated = [...tasks];
    const dragTask = updated.find((t) => t.id === dragId);
    if (!dragTask) return;
    dragTask.parent_task_id = newParentId;
    dragTask.position = 9999; // or calculate a new position among siblings

    setTasks(updated);

    const { error } = await supabase
      .from('tasks')
      .update({ parent_task_id: newParentId, position: 9999 })
      .eq('id', dragId);

    if (error) {
      console.error('Error updating parent:', error);
    } else {
      // Re-fetch or re-sort tasks
      const { data, error: fetchErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('origin', 'instance')
        .order('position', { ascending: true });
      if (fetchErr) console.error('Error re-fetching tasks:', fetchErr);
      else setTasks(data);
    }
  };

  if (loading) return <div className="text-center mt-8">Loading tasks...</div>;

  const tree = buildTaskTree(tasks);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-xl mx-auto mt-8 p-4 bg-gray-50 rounded shadow">
        <h1 className="text-2xl font-semibold mb-4 text-center">Task List</h1>
        {tree.length === 0 ? (
          <p className="text-center text-gray-500">No instance tasks found.</p>
        ) : (
          tree.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              level={0}
              moveTask={moveTask}
              updateParent={updateParent}
              toggleComplete={toggleComplete}
            />
          ))
        )}
      </div>
    </DndProvider>
  );
}

export default TaskList;
