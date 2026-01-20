import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssetList from './AssetList';
import { assetService } from '../services/assetService';
import { useQuery } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../services/assetService');
vi.mock('@shared/ui/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query');
    return {
        ...actual,
        useQuery: vi.fn(),
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    };
});

describe('AssetList', () => {
    const mockAssets = [
        { id: '1', name: 'Microphone', category: 'equipment', status: 'available', location: 'Box A', value: 100 },
        { id: '2', name: 'Banner', category: 'marketing', status: 'in_use', location: 'Hall', value: 50 },
    ];

    it('renders loading state', () => {
        // Mock useQuery to return loading
        useQuery.mockReturnValue({ data: [], isLoading: true });

        const { container } = render(<AssetList projectId="p1" />);
        // Check for spinner class or Loader
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders asset list', () => {
        // Mock useQuery to return data
        useQuery.mockReturnValue({ data: mockAssets, isLoading: false });

        render(<AssetList projectId="p1" />);

        expect(screen.getByText('Microphone')).toBeInTheDocument();
        expect(screen.getByText('Banner')).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
    });

    it('filters assets', () => {
        useQuery.mockReturnValue({ data: mockAssets, isLoading: false });

        render(<AssetList projectId="p1" />);

        const searchInput = screen.getByPlaceholderText('Search assets...');
        fireEvent.change(searchInput, { target: { value: 'Micro' } }); // Search for Microphone

        expect(screen.getByText('Microphone')).toBeInTheDocument();
        expect(screen.queryByText('Banner')).not.toBeInTheDocument();
    });

    it('opens modal on add button click', () => {
        useQuery.mockReturnValue({ data: mockAssets, isLoading: false });

        render(<AssetList projectId="p1" />);

        const addButton = screen.getByRole('button', { name: /add asset/i });
        fireEvent.click(addButton);

        // Check if modal title appears (it's in a Dialog/Portal, so commonly we check strict text)
        expect(screen.getByText('Add New Asset')).toBeInTheDocument();
    });
});
