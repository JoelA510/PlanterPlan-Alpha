import { useMemo } from 'react';
import type { TaskCommentWithAuthor } from '@/shared/db/app.types';
import { CommentItem } from './CommentItem';

interface CommentListProps {
    comments: TaskCommentWithAuthor[];
    currentUserId: string | null;
    onReply: (parentCommentId: string, body: string, mentions: string[]) => void;
    onEdit: (commentId: string, body: string, mentions: string[]) => void;
    onDelete: (commentId: string) => void;
}

interface Grouped {
    topLevel: TaskCommentWithAuthor[];
    byId: Map<string, TaskCommentWithAuthor>;
    repliesByTop: Map<string, TaskCommentWithAuthor[]>;
}

/**
 * Build top-level + replies-by-top maps in a single O(N) pass with a
 * memoized ancestor walk. A parent-chain that dead-ends (parent row not in
 * the set) treats the orphan's nearest known ancestor as its top-level.
 */
function groupComments(comments: TaskCommentWithAuthor[]): Grouped {
    const byId = new Map<string, TaskCommentWithAuthor>();
    for (const c of comments) byId.set(c.id, c);

    const ancestorCache = new Map<string, string>();
    function topLevelIdOf(comment: TaskCommentWithAuthor): string {
        if (!comment.parent_comment_id) return comment.id;
        const cached = ancestorCache.get(comment.id);
        if (cached !== undefined) return cached;
        const parent = byId.get(comment.parent_comment_id);
        const topId = parent ? topLevelIdOf(parent) : comment.id;
        ancestorCache.set(comment.id, topId);
        return topId;
    }

    const topLevel: TaskCommentWithAuthor[] = [];
    const repliesByTop = new Map<string, TaskCommentWithAuthor[]>();
    for (const c of comments) {
        if (!c.parent_comment_id) {
            topLevel.push(c);
        } else {
            const topId = topLevelIdOf(c);
            const arr = repliesByTop.get(topId);
            if (arr) arr.push(c);
            else repliesByTop.set(topId, [c]);
        }
    }
    return { topLevel, byId, repliesByTop };
}

/**
 * Groups comments into top-level rows with their descendants rendered in a
 * single reply column. The DB stores threads without a depth cap; the UI
 * flattens anything below depth-1 up to the reply column via chain-lift and
 * labels it with `↪ in reply to @author` so lineage stays visible.
 */
export function CommentList({ comments, currentUserId, onReply, onEdit, onDelete }: CommentListProps) {
    const { topLevel, byId, repliesByTop } = useMemo(() => groupComments(comments), [comments]);

    return (
        <div className="space-y-6" data-testid="comment-list">
            {topLevel.map((top) => {
                const replies = repliesByTop.get(top.id) ?? [];
                return (
                    <div key={top.id} className="space-y-3">
                        <CommentItem
                            comment={top}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                        {replies.length > 0 && (
                            <div className="pl-10 space-y-4 border-l-2 border-slate-100" data-testid={`replies-${top.id}`}>
                                {replies.map((r) => {
                                    const immediateParent =
                                        r.parent_comment_id && r.parent_comment_id !== top.id
                                            ? byId.get(r.parent_comment_id) ?? null
                                            : null;
                                    const inReplyTo =
                                        immediateParent?.author?.email?.split('@')[0] ?? null;
                                    return (
                                        <CommentItem
                                            key={r.id}
                                            comment={r}
                                            currentUserId={currentUserId}
                                            inReplyToAuthor={inReplyTo}
                                            onReply={onReply}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
