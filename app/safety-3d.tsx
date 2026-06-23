import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Screen } from '../components/ui';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../lib/theme';
import { useMemo } from 'react';

export default function Safety3DScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="3D Safety Guide" />
      <View style={styles.container}>
        <WebView
          source={{ uri: 'https://gilavi.github.io/Sarke2.0/app/#/safety-standalone' }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          )}
        />
      </View>
    </Screen>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    webview: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
  });
}
