import StatusCard from './StatusCard';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <StatusCard
        title="Something went wrong"
        variant="error"
        actions={
          <button
            onClick={resetErrorBoundary}
            className="btn-primary"
          >
            Try Again
          </button>
        }
      >
        <div className="text-left bg-slate-100 p-4 rounded mb-6 overflow-auto max-h-40 text-sm font-mono text-slate-700 w-full">
          {error.message}
        </div>
        <p className="text-slate-600 mb-6">
          We apologize for the inconvenience. Please try reloading the application.
        </p>
      </StatusCard>
    </div>
  );
};
export default ErrorFallback;
