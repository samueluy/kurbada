import { Component, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.warn('[ErrorBoundary] caught error:', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 16,
        }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(198,69,55,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AppText variant="heroMetric" style={{ color: palette.danger, fontSize: 40 }}>
            !
          </AppText>
        </View>
        <AppText variant="screenTitle" style={{ fontSize: 24, textAlign: 'center' }}>
          Something went wrong
        </AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
          {this.state.error?.message ?? 'An unexpected error occurred. Try again or restart the app.'}
        </AppText>
        <Button
          title="Try Again"
          onPress={this.handleReset}
          style={{
            backgroundColor: palette.danger,
            borderRadius: radius.pill,
            minHeight: 48,
            paddingHorizontal: 32,
          }}
        />
      </View>
    );
  }
}
