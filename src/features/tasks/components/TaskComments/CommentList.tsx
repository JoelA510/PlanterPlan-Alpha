import type { TaskCommentWithAuthor } from '@/shared/db/app.types';
import { CommentItem } from './CommentItem';

interface CommentListProps {
    comments: TaskCommentWithAuthor[];
    currentUserId: string | null;
    onReply: (parentCommentId: string, body: string, mentions: string[]) => void;
    onEdit: (commentId: string, body: string, mentions: string[]) => void;
    onDelete: (commentId: string) => void;
}

/**
 * Groups comments into top-level rows with their descendants rendered in a
 * single reply column. The DB stores threads without a depth cap; the UI
 * flattens anything below depth-1 up to the reply column via chain-lift and
 * labels it with `↪ in reply to @author` so lineage stays visible.
 */
export function CommentList({ comments, currentUserId, onReply, onEdit, onDelete }: CommentListProps) {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const topLevel = comments.filter((c) => !c.parent_comment_id);

    /** Walks parent_comment_id chain until it hits a top-level comment. */
    function topLevelAncestorOf(comment: TaskCommentWithAuthor): TaskCommentWithAuthor {
        let cursor: TaskCommentWithAuthor = comment;
        while (cursor.parent_comment_id) {
            const parent = byId.get(cursor.parent_comment_id);
            if (!parent) break;
            cursor = parent;
        }
        return cursor;
    }

    /** Collects every descendant (at any depth) of a top-level comment. */
    function descendantsOf(topId: string): TaskCommentWithAuthor[] {
        return comments.filter((c) => c.parent_comment_id && topLevelAncestorOf(c).id === topId);
    }

    return (
        <div className="space-y-6" data-testid="comment-list">
            {topLevel.map((top) => {
                const replies = descendantsOf(top.id);
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
