import { useMemo } from 'react';
import useMasterLibrarySearch from '@/features/library/hooks/useMasterLibrarySearch';
import { rankRelated } from '@/features/library/lib/related-templates';
import type { RankableTemplate } from '@/features/library/lib/related-templates';

interface SeedTask {
    id: string;
    title?: string | null;
    description?: string | null;
}

interface UseRelatedTemplatesOptions {
    /** Template ids to hide (forwarded through `useMasterLibrarySearch`). */
    excludeTemplateIds?: readonly string[];
    /** Max suggestions to return. Defaults to 5. */
    limit?: number;
    /** Pass `false` to skip the fetch entirely (e.g. dialog closed). */
    enabled?: boolean;
}

/**
 * Wave 25 — Hook driving the "Related templates" section of
 * `StrategyFollowUpDialog`. Reads the full Master Library snapshot out of
 * `useMasterLibrarySearch`'s cache (so both surfaces share one fetch), then
 * ranks candidates by title/description similarity to the seed via
 * `rankRelated` from `@/features/library/lib/related-templates`.
 *
 * Skips the rank entirely when the seed has no usable title/description (no
 * random suggestions on an empty seed). Returns the same `{ results,
 * isLoading, hasResults }` shape `MasterLibrarySearch` consumers already
 * expect so the dialog's click path can reuse its existing row renderer.
 */
export const useRelatedTemplates = (
    seedTask?: SeedTask | null,
    { excludeTemplateIds, limit = 5, enabled = true }: UseRelatedTemplatesOptions = {},
) => {
    const { results: allResults, isLoading } = useMasterLibrarySearch({
        query: '',
        enabled,
        excludeTemplateIds,
    });

    const results = useMemo(() => {
        if (!seedTask) return [];
        const hasAnyText = Boolean(seedTask.title?.trim() || seedTask.description?.trim());
        if (!hasAnyText) return [];
        return rankRelated<RankableTemplate>(
            seedTask,
            allResults as RankableTemplate[],
            limit,
        );
    }, [seedTask, allResults, limit]);

    return {
        results,
        isLoading,
        hasResults: results.length > 0,
    };
};

export default useRelatedTemplates;
