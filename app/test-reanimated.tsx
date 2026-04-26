import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function TestReanimated() {
  const offset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Animated.View
        style={[
          { width: 100, height: 100, backgroundColor: '#147A4F', borderRadius: 16 },
          animatedStyle,
        ]}
      />
      <Pressable
        onPress={() => {
          offset.value = withSpring(Math.random() * 200 - 100, {
            damping: 15,
            stiffness: 400,
          });
        }}
        style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#E5E5EA', borderRadius: 10 }}
      >
        <Text style={{ fontWeight: '700' }}>Spring!</Text>
      </Pressable>
    </View>
  );
}
