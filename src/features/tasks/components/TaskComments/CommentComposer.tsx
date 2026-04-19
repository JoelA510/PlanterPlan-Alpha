import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import { extractMentions } from '@/features/tasks/lib/comment-mentions';

const schema = z.object({
    body: z.string().trim().min(1, 'Comment cannot be empty').max(10000),
});
type FormData = z.infer<typeof schema>;

interface CommentComposerProps {
    initialBody?: string;
    submitLabel?: string;
    placeholder?: string;
    onSubmit: (body: string, mentions: string[]) => void;
    onCancel?: () => void;
}

export function CommentComposer({
    initialBody = '',
    submitLabel = 'Send',
    placeholder = 'Add a comment…',
    onSubmit,
    onCancel,
}: CommentComposerProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { body: initialBody },
    });

    const submit = handleSubmit((data) => {
        const trimmed = data.body.trim();
        const mentions = extractMentions(trimmed);
        onSubmit(trimmed, mentions);
        reset({ body: '' });
    });

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape' && onCancel) {
            e.preventDefault();
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
        }
    };

    return (
        <form onSubmit={submit} className="space-y-2">
            <Textarea
                placeholder={placeholder}
                rows={3}
                data-testid="comment-composer-textarea"
                {...register('body')}
                onKeyDown={onKeyDown}
            />
            {errors.body && (
                <p className="text-xs text-rose-600" data-testid="comment-composer-error">
                    {errors.body.message}
                </p>
            )}
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    data-testid="comment-composer-submit"
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                >
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
