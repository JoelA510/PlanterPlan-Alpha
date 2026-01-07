const fs = require('fs');
const path = require('path');

// Map Component Name -> New Absolute Path (Alias)
// This strategy captures all variations: relative, absolute, legacy.
const COMPONENT_MAP = {
    // TASKS
    'TaskList': '@features/tasks/components/TaskList',
    'NewTaskForm': '@features/tasks/components/NewTaskForm',
    'CreateTaskForm': '@features/tasks/components/CreateTaskForm',
    'EditTaskForm': '@features/tasks/components/EditTaskForm',
    'TaskItem': '@features/tasks/components/TaskItem',
    'TaskFormFields': '@features/tasks/components/TaskFormFields',
    'TaskResources': '@features/tasks/components/TaskResources',
    'TaskDetailsView': '@features/tasks/components/TaskDetailsView',

    // PROJECTS
    'NewProjectForm': '@features/projects/components/NewProjectForm',
    'ProjectHeader': '@features/projects/components/ProjectHeader',
    'JoinedProjectsList': '@features/projects/components/JoinedProjectsList',
    'InviteMemberModal': '@features/projects/components/InviteMemberModal',

    // LIBRARY
    'MasterLibraryList': '@features/library/components/MasterLibraryList',
    'MasterLibrarySearch': '@features/library/components/MasterLibrarySearch',
    'TemplateList': '@features/library/components/TemplateList',

    // NAVIGATION
    'SideNav': '@features/navigation/components/SideNav',
    'SidebarNavItem': '@features/navigation/components/SidebarNavItem',
    'SidebarSkeleton': '@features/navigation/components/SidebarSkeleton',

    // AUTH
    'LoginForm': '@features/auth/components/LoginForm',

    // REPORTS
    'ProjectReport': '@features/reports/components/ProjectReport',

    // SHARED UI
    'RoleIndicator': '@shared/ui/RoleIndicator',
    'ErrorFallback': '@shared/ui/ErrorFallback',
    'ErrorBoundary': '@shared/ui/ErrorBoundary',
    'Breadcrumbs': '@shared/ui/Breadcrumbs',

    // HOOKS (Tasks)
    'useTaskOperations': '@features/tasks/hooks/useTaskOperations',
    'useTaskQuery': '@features/tasks/hooks/useTaskQuery',
    'useTaskMutations': '@features/tasks/hooks/useTaskMutations',
    'useTaskDrag': '@features/tasks/hooks/useTaskDrag',
    'useTaskForm': '@features/tasks/hooks/useTaskForm',

    // HOOKS (Library)
    'useMasterLibraryTasks': '@features/library/hooks/useMasterLibraryTasks',
    'useMasterLibrarySearch': '@features/library/hooks/useMasterLibrarySearch',
    'useTreeState': '@features/library/hooks/useTreeState',
    'useTaskBoard': '@features/tasks/hooks/useTaskBoard',
    'useDebounce': '@shared/lib/hooks/useDebounce',

    // SERVICES
    'taskService': '@features/tasks/services/taskService',
    'taskCloneService': '@features/tasks/services/taskCloneService',
    'taskResourcesService': '@features/tasks/services/taskResourcesService',
    'projectService': '@features/projects/services/projectService',
    'taskMasterLibraryService': '@features/library/services/taskMasterLibraryService',
    'positionService': '@features/tasks/services/positionService',

    // SHARED LIB
    'treeHelpers': '@shared/lib/treeHelpers',
    'viewHelpers': '@shared/lib/viewHelpers',
    'highlightMatches': '@shared/lib/highlightMatches',
    'dateUtils': '@shared/lib/date-engine',

    // APP CORE
    'supabaseClient': '@app/supabaseClient',
    'AuthContext': '@app/contexts/AuthContext',
    'ToastContext': '@app/contexts/ToastContext',
    'App': '@app/App',
    'constants': '@app/constants/index', // Points to index.js
};

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'build') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles('./src');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // 1. Replace Component Imports
    // Matches: from '.../Name' or " .../Name"
    // Capture group 2 is the filename part, validating it matches a known component
    Object.keys(COMPONENT_MAP).forEach(componentName => {
        const newPath = COMPONENT_MAP[componentName];

        // Regex to match imports ending with the component name (ignoring extension)
        // e.g. from '../molecules/TaskItem' or from './TaskItem'
        // We look for /ComponentsName['"] or /ComponentName.js['"]?
        const regex = new RegExp(`['"]([\\.\\/]*[\\w\\-\\/]*\\/)?${componentName}(\\.js|\\.jsx)?['"]`, 'g');

        content = content.replace(regex, `'${newPath}'`);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
        changedFiles++;
    }
});

console.log(`Finished processing. Updated ${changedFiles} files.`);
