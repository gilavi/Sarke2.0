import { Progress } from '@mantine/core';

export function PdfUsageBar({ value, max, locked }: { value: number; max: number; locked?: boolean }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <Progress
      value={pct}
      size="xs"
      radius="xl"
      color={locked ? 'yellow' : 'brand'}
    />
  );
}
