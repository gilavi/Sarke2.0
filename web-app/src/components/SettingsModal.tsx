import { Modal, Switch, Stack, Text, SegmentedControl } from '@mantine/core';
import { useTheme } from '@/lib/theme';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { isDark, toggleMode } = useTheme();

  const setLanguage = (lang: string) => {
    localStorage.setItem('hubble-lang', lang);
    window.location.reload();
  };
  const currentLang = localStorage.getItem('hubble-lang') || 'ka';

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="პარამეტრები"
      size="sm"
      radius="md"
      centered
    >
      <Stack gap="lg">
        <div>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb="xs">
            გარეგნობა
          </Text>
          <Switch
            checked={isDark}
            onChange={toggleMode}
            label="მუქი რეჟიმი"
          />
        </div>

        <div>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb="xs">
            ენა
          </Text>
          <SegmentedControl
            value={currentLang}
            onChange={(v) => setLanguage(v)}
            data={[
              { value: 'ka', label: 'ქართული' },
              { value: 'en', label: 'English' },
            ]}
            fullWidth
          />
        </div>
      </Stack>
    </Modal>
  );
}
