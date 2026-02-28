export const PROJECT_TABS = {
    BOARD: 'board',
    PEOPLE: 'people',
} as const;

export type ProjectTab = (typeof PROJECT_TABS)[keyof typeof PROJECT_TABS];

export const PROJECT_TAB_LABELS: Record<ProjectTab, string> = {
    [PROJECT_TABS.BOARD]: 'Tasks & Board',
    [PROJECT_TABS.PEOPLE]: 'People',
};
