import { View } from 'react-native';
import { Image } from 'expo-image';
import { FileText } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import type { Report } from '../../types/models';
import { useReportCoverUri } from './useReportCover';

/**
 * Report list-row avatar: a 16:9 rounded thumbnail of the report's cover photo
 * (falls back to a document glyph when the report has no images yet). Unlike
 * the circular avatars, reports get a landscape thumbnail so the cover photo
 * reads at a glance. For the larger horizontal/grid surfaces use `ReportCard`.
 */
export function ReportThumb({ report, height = 36 }: { report: Report; height?: number }) {
  const { theme } = useTheme();
  const width = Math.round((height * 16) / 9);
  const uri = useReportCoverUri(report);

  const box = {
    width,
    height,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (uri) {
    return (
      <View style={box}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
    );
  }
  return (
    <View style={box}>
      <FileText size={Math.round(height * 0.5)} color={theme.colors.accent} strokeWidth={1.5} />
    </View>
  );
}
