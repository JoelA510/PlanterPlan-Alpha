import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportProjectToCSV, type ExportableTask, type ExportableProject } from '@/features/projects/lib/export-utils';

describe('exportProjectToCSV', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let lastCsvContent: string;

  beforeEach(() => {
    lastCsvContent = '';
    clickSpy = vi.fn();

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

    vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: vi.fn(),
      click: clickSpy,
      style: { visibility: '' },
    } as unknown as HTMLElement);

    // Capture the CSV content passed to createObjectURL via Blob
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    vi.spyOn(URL, 'createObjectURL').mockImplementation((_blob: Blob) => {
      // Read the blob content synchronously by inspecting the Blob constructor call
      return 'blob:mock-url';
    });

    // Intercept Blob to capture content
    const OrigBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class MockBlob extends OrigBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        if (parts && parts.length > 0) {
          lastCsvContent = parts[0] as string;
        }
      }
    });

  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const project: ExportableProject = { name: 'Test Project' };

  const tasks: ExportableTask[] = [
    {
      id: 'root-1',
      title: 'Root Task',
      parent_task_id: null,
      root_id: 'root-1',
      status: 'in_progress',
      start_date: '2026-01-01',
      due_date: '2026-06-01',
      description: 'A description',
      assignee_id: 'user-1',
    },
    {
      id: 'child-1',
      title: 'Child Task',
      parent_task_id: 'root-1',
      root_id: 'root-1',
      status: 'todo',
      start_date: null,
      due_date: null,
      description: null,
      assignee_id: null,
    },
  ];

  it('triggers a download', () => {
    exportProjectToCSV(project, tasks);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('creates CSV with correct headers', () => {
    exportProjectToCSV(project, tasks);
    expect(lastCsvContent).toContain('ID,Title,Type,Status,Start Date,Due Date,Description,Assignee');
  });

  it('escapes quotes in title and description', () => {
    const tasksWithQuotes: ExportableTask[] = [{
      id: 'q1',
      title: 'Say "hello"',
      description: 'A "quoted" desc',
      parent_task_id: 'p',
      root_id: 'r',
      status: 'todo',
      start_date: null,
      due_date: null,
    }];
    exportProjectToCSV(project, tasksWithQuotes);
    expect(lastCsvContent).toContain('""hello""');
    expect(lastCsvContent).toContain('""quoted""');
  });

  it('identifies task types correctly', () => {
    exportProjectToCSV(project, tasks);
    expect(lastCsvContent).toContain('Project Root');
    expect(lastCsvContent).toContain('Subtask');
  });

  it('does nothing for empty tasks', () => {
    exportProjectToCSV(project, []);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('does nothing for null tasks', () => {
    exportProjectToCSV(project, null);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('handles fields containing commas by wrapping in quotes', () => {
    const tasksWithCommas: ExportableTask[] = [{
      id: 'c1',
      title: 'Task, with commas',
      description: 'A description, with, many commas',
      parent_task_id: 'p',
      root_id: 'r',
      status: 'todo',
      start_date: null,
      due_date: null,
    }];
    exportProjectToCSV(project, tasksWithCommas);
    // Fields with commas should be quoted in CSV
    expect(lastCsvContent).toContain('"Task, with commas"');
  });
});
