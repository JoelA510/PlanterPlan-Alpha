import React from 'react';
import PropTypes from 'prop-types';
import ErrorFallback from './ErrorFallback';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(`[ErrorBoundary] Caught error in ${this.props.name || 'Component'}:`, error, errorInfo);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Allow custom fallback, or default to standard ErrorFallback
            const FallbackComponent = this.props.fallback || ErrorFallback;

            // If passing a component class/function
            if (typeof this.props.fallback === 'function' || typeof this.props.fallback === 'object') {
                // If it's a valid React element (already instantiated), clone it
                if (React.isValidElement(this.props.fallback)) {
                    return React.cloneElement(this.props.fallback, {
                        error: this.state.error,
                        resetErrorBoundary: this.resetErrorBoundary
                    });
                }
                // Otherwise assume it's a component reference
                return <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
            }

            // Default case
            return <ErrorFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.oneOfType([PropTypes.elementType, PropTypes.element]),
    name: PropTypes.string,
};

export default ErrorBoundary;
