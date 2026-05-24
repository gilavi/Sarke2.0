import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

interface SectionHeaderProps {
  title: string;
  action?: SectionHeaderAction;
}

// Legacy SectionHeader from the original components/ui.tsx. Kept exported as
// `SectionHeader` from components/ui for backward compatibility with callers
// that haven't migrated to ../SectionHeader (re-exported as SectionHeaderNew).
export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: theme.colors.inkSoft,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
