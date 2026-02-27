import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import { useAuth } from '@/app/contexts/AuthContext';
import type { Database } from '@/shared/db/database.types';
import type { Task, Project } from '@/shared/db/app.types';

type TeamMemberRow = Database['public']['Tables']['project_members']['Row'];

export function useDashboard() {
    const { user, loading: authLoading } = useAuth();

    // URL Action State
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Dashboard Specific Local State
    const [wizardDismissed, setWizardDismissed] = useState<boolean>(() => {
        return localStorage.getItem('gettingStartedDismissed') === 'true';
    });
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-open modal when navigated with ?action=new-project or ?action=new-template
    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'new-project') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowCreateModal(true);
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
        } else if (action === 'new-template') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowTemplateModal(true);
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Data Fetching
    const {
        data: projects = [],
        isLoading: loadingProjects,
        isError,
        error
    } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => planter.entities.Project.list(),
        enabled: !!user,
    });

    const { data: allTasks = [] } = useQuery<Task[]>({
        queryKey: ['allTasks'],
        queryFn: () => planter.entities.Task.listByCreator(user?.id as string),
        enabled: !!user,
    });

    const { data: teamMembers = [] } = useQuery<TeamMemberRow[]>({
        queryKey: ['teamMembers'],
        queryFn: () => planter.entities.TeamMember.list(),
        enabled: !!user,
    });

    // Derived State / Filtering
    const activeProjects = useMemo(() => {
        return Array.isArray(projects) ? projects.filter(p => p.status === 'active') : [];
    }, [projects]);

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(allTasks)) return [];

        let tasks = selectedProjectId
            ? allTasks.filter(t => t.project_id === selectedProjectId)
            : allTasks;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(lowerQuery) ||
                t.description?.toLowerCase().includes(lowerQuery)
            );
        }

        return tasks as Task[];
    }, [allTasks, selectedProjectId, searchQuery]);

    // Loading State Aggregation
    const isLoading = authLoading || loadingProjects;

    // Handlers
    const handleDismissWizard = () => {
        setWizardDismissed(true);
        localStorage.setItem('gettingStartedDismissed', 'true');
    };

    return {
        state: {
            isLoading,
            isError,
            error,
            user,
            showCreateModal,
            showTemplateModal,
            wizardDismissed,
            searchQuery,
            selectedProjectId
        },
        data: {
            projects,
            activeProjects,
            allTasks,
            filteredTasks,
            teamMembers
        },
        actions: {
            setShowCreateModal,
            setShowTemplateModal,
            setSearchQuery,
            setSelectedProjectId,
            handleDismissWizard
        }
    };
}
