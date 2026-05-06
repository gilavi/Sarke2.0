import { View, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Screen } from '../components/ui';
import { useTheme } from '../lib/theme';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export default function Safety3DScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '3D Safety Guide',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700' },
          headerTintColor: theme.colors.accent,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <WebView
          source={{ uri: 'https://gilavi.github.io/Sarke2.0/#/safety' }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <View style={[styles.spinner, { borderTopColor: theme.colors.accent }]} />
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
    backBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: -4,
    },
    loader: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    spinner: {
      width: 32,
      height: 32,
      borderWidth: 3,
      borderColor: theme.colors.hairline,
      borderRadius: 16,
    },
  });
}
