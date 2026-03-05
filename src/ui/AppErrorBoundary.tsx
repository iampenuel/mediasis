import React, { PropsWithChildren } from 'react';
import { DevSettings, Platform } from 'react-native';

import { logError } from '../lib/logging';
import { ErrorFallback } from './ErrorFallback';

type ErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    logError(error, { source: 'AppErrorBoundary' });
  }

  handleReload = () => {
    this.setState({ hasError: false });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    DevSettings.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}
