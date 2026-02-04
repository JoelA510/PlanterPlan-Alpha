import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { PROJECT_TABS, PROJECT_TAB_LABELS } from '../../../app/constants/project';

const ProjectTabs = memo(function ProjectTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: PROJECT_TABS.BOARD, label: PROJECT_TAB_LABELS[PROJECT_TABS.BOARD] },
        { id: PROJECT_TABS.PEOPLE, label: PROJECT_TAB_LABELS[PROJECT_TABS.PEOPLE] },
    ];

    return (
        <nav
            aria-label="Project Sections"
            className="flex items-center space-x-1 border-b border-slate-200 mb-6 overflow-x-auto"
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`${tab.id}-panel`}
                        id={`${tab.id}-tab`}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
});



export default ProjectTabs;
