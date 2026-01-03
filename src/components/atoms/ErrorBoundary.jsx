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
    console.error(
      `[ErrorBoundary] Caught error in ${this.props.name || 'Component'}:`,
      error,
      errorInfo
    );
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      const props = {
        error: this.state.error,
        resetErrorBoundary: this.resetErrorBoundary,
      };

      if (React.isValidElement(Fallback)) {
        return React.cloneElement(Fallback, props);
      }

      if (typeof Fallback === 'function') {
        return <Fallback {...props} />;
      }

      return <ErrorFallback {...props} />;
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
