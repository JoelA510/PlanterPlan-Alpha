import React from 'react';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <div className="text-left bg-gray-100 p-4 rounded mb-6 overflow-auto max-h-40 text-sm font-mono text-gray-700">
          {error.message}
        </div>
        <p className="text-gray-600 mb-6">
          We apologize for the inconvenience. Please try reloading the application.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorFallback;
