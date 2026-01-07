import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './ErrorBoundary';

// Quiet console.error for these tests as we expect errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

const Bomb = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Boom!');
  }
  return <div>Safe</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Boom!')).toBeInTheDocument();
  });

  it('allows resetting the error boundary', async () => {
    class RecoverableBomb extends React.Component {
      constructor(props) {
        super(props);
        this.state = { shouldThrow: true };
      }
      render() {
        if (this.state.shouldThrow) {
          throw new Error('Recoverable Error');
        }
        return <div>Back to Safety</div>;
      }
    }

    render(
      <ErrorBoundary>
        <RecoverableBomb />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryButton);

    // Check if it caught the second error
    const message = await screen.findByText(/Recoverable Error/i);
    expect(message).toBeInTheDocument();
  });

  it('supports custom fallback component', () => {
    const CustomFallback = ({ error }) => <div>Custom: {error.message}</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom: Boom!')).toBeInTheDocument();
  });
});
