import { Component } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas } from '@react-three/fiber/native';

class IOSCanvasRecovery extends Component {
  state = { error: null, retried: false };
  retryTimer = null;

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (this.isPrecisionError(error) && !this.state.retried) {
      // Expo GL can return undefined from a shader query when its context is gone.
      // Let the failed GLView unmount before creating a fresh context.
      this.retryTimer = setTimeout(this.retry, 0);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.retryTimer);
  }

  isPrecisionError(error) {
    return /(?:undefined|null).*precision|precision.*(?:undefined|null)/i.test(error?.message || '');
  }

  retry = () => {
    clearTimeout(this.retryTimer);
    this.setState({ error: null, retried: true });
  };

  render() {
    const { error, retried } = this.state;
    if (!error) return this.props.children;
    if (!this.isPrecisionError(error)) throw error;

    return (
      <View style={[this.props.style, styles.fallback]}>
        {retried ? (
          <Pressable accessibilityRole="button" onPress={this.retry}>
            <Text style={styles.label}>Couldn’t start 3D rendering. Tap to retry.</Text>
          </Pressable>
        ) : (
          <Text accessibilityLiveRegion="polite" style={styles.label}>Restarting 3D rendering…</Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#223144' },
  label: { color: '#FFF1CD', padding: 12, textAlign: 'center' },
});

export default function GameCanvas(props) {
  const canvasProps = Platform.OS === 'web'
    ? props
    : {
        ...props,
        gl: {
          ...props.gl,
          // Native Canvas already uses the full device pixel ratio. Disabling
          // four-sample MSAA avoids multiplying framebuffer memory on phones.
          antialias: false,
        },
      };
  const canvas = <Canvas {...canvasProps} />;
  return Platform.OS === 'ios'
    ? <IOSCanvasRecovery style={props.style}>{canvas}</IOSCanvasRecovery>
    : canvas;
}
