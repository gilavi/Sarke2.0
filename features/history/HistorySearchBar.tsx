import { Pressable, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

/**
 * Compact inline search field for the History screen — filters the loaded
 * rows of every tab client-side (title / type / project name; see
 * historyListUtils.matchesQuery). Not a form field, so it deliberately skips
 * FloatingLabelInput and matches the chip strip's surface instead.
 */
export function HistorySearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.subtleSurface,
        borderRadius: 12,
        paddingHorizontal: 12,
      }}
    >
      <Search size={16} color={theme.colors.inkFaint} strokeWidth={1.8} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('history.searchPlaceholder')}
        placeholderTextColor={theme.colors.inkFaint}
        style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: theme.colors.ink }}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={t('history.searchPlaceholder')}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          {...a11y(t('history.clearSearch'), undefined, 'button')}
        >
          <X size={16} color={theme.colors.inkFaint} strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </View>
  );
}
