import { vi } from 'vitest';

// Common React Native module mocks for jsdom environment
vi.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
  default: {},
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('div', { style }, children),
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('expo-image', () => ({
  Image: ({ source, style, ...props }: any) =>
    require('react').createElement('img', { src: source?.uri || source, style, ...props }),
}));

vi.mock('expo-linking', () => ({
  createURL: vi.fn((path: string) => `sarke://${path}`),
  getInitialURL: vi.fn(() => Promise.resolve(null)),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        useMockData: false,
      },
    },
  },
}));

vi.mock('expo-font', () => ({
  loadAsync: vi.fn(() => Promise.resolve()),
  isLoaded: vi.fn(() => true),
}));

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSegments: () => ['(tabs)', 'home'],
  useLocalSearchParams: () => ({}),
  Stack: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
}));

vi.mock('react-native-screens', () => ({
  enableScreens: vi.fn(),
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  PanGestureHandler: ({ children }: any) => children,
  TouchableOpacity: ({ children, onPress, ...props }: any) =>
    require('react').createElement('button', { onClick: onPress, ...props }, children),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  setItemAsync: vi.fn(() => Promise.resolve()),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: { ink: '#1a1a1a', inkSoft: '#666', accent: '#147A4F' },
      typography: { fontFamily: { body: 'Inter', bodySemiBold: 'Inter-SemiBold' } },
      radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
      motion: { spring: { gentle: { damping: 20, stiffness: 180, mass: 1 } } },
      shadows: { glow: {}, sm: {}, none: {} },
    },
  }),
}));

vi.mock('../../lib/accessibility', () => ({
  useScaledSize: (size: number) => size,
}));
