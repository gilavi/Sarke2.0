import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';

function NewInspectionFAB({ style }: { style?: any }) {
  const router = useRouter();
  return (
    <Pressable
      style={[styles.fabWrapper, style]}
      onPress={() => router.push('/new-inspection' as any)}
      accessibilityRole="button"
      accessibilityLabel="ახალი შემოწმება"
    >
      <View style={styles.fab}>
        <Ionicons name="add" size={30} color={theme.colors.white} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.inkSoft,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.hairline,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'მთავარი',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'პროექტები',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
        }}
      />
      {/* Center FAB — custom button, no actual screen */}
      <Tabs.Screen
        name="new-inspection"
        options={{
          title: '',
          tabBarButton: (props) => <NewInspectionFAB style={props.style} />,
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'სერტიფიკატები',
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'მეტი',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle" color={color} size={size} />,
        }}
      />
      {/* Regulations accessible via More → hub tile */}
      <Tabs.Screen name="regulations" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
});
