import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makePresenceState } from '@test';
import { PresenceBar } from '@/features/projects/components/PresenceBar';

describe('PresenceBar (Wave 27)', () => {
    it('renders nothing when there are no peers', () => {
        const { container } = render(<PresenceBar presentUsers={[]} currentUserId="me" />);
        expect(container.firstChild).toBeNull();
    });

    it('hides the current user from the chip roster', () => {
        const me = makePresenceState({ user_id: 'me', email: 'me@example.com' });
        const them = makePresenceState({ user_id: 'them', email: 'them@example.com' });
        render(<PresenceBar presentUsers={[me, them]} currentUserId="me" />);
        expect(screen.queryByTestId('presence-chip-me')).toBeNull();
        expect(screen.getByTestId('presence-chip-them')).toBeInTheDocument();
    });

    it('caps visible chips at 5 and renders a +N overflow chip', () => {
        const peers = Array.from({ length: 8 }, (_, i) =>
            makePresenceState({ user_id: `u${i}`, email: `peer${i}@example.com` }),
        );
        render(<PresenceBar presentUsers={peers} currentUserId="me" />);

        // 5 visible chips
        for (let i = 0; i < 5; i++) {
            expect(screen.getByTestId(`presence-chip-u${i}`)).toBeInTheDocument();
        }
        // u5 / u6 / u7 folded into overflow
        expect(screen.queryByTestId('presence-chip-u5')).toBeNull();
        expect(screen.queryByTestId('presence-chip-u6')).toBeNull();
        expect(screen.queryByTestId('presence-chip-u7')).toBeNull();

        const overflow = screen.getByTestId('presence-chip-overflow');
        expect(overflow).toHaveTextContent('+3');
    });

    it('renders an accessible tooltip label with email + minutes viewing', () => {
        const joinedAt = Date.now() - 5 * 60_000; // 5 minutes ago
        const them = makePresenceState({ user_id: 'them', email: 'them@example.com', joinedAt });
        render(<PresenceBar presentUsers={[them]} currentUserId="me" />);
        const chip = screen.getByTestId('presence-chip-them');
        expect(chip).toHaveAttribute('aria-label', expect.stringContaining('them@example.com'));
        expect(chip.getAttribute('aria-label')).toMatch(/viewing for \d+ minutes?|just now/);
    });
});
