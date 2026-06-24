import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { IconButton } from './primitives/IconButton';

interface Props {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Circular outline back button shared by flow headers (`FlowHeader`), stack
 * `headerLeft`s and stacked screens. The canonical "outline icon button" — it's
 * just {@link IconButton} `variant="outline"` with a ChevronLeft, so it inherits
 * the shared press bounce. 38px circle kept here so back buttons don't drift.
 */
export function HeaderBackButton({ onPress, disabled }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <IconButton
      icon={ChevronLeft}
      onPress={onPress ?? (() => router.back())}
      a11yLabel={t('common.back')}
      a11yHint={t('components.backButtonHint')}
      variant="outline"
      size="lg"
      disabled={disabled}
      hitSlop={11}
      style={{ width: 38, height: 38, borderRadius: 19 }}
    />
  );
}
