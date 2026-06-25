// SuccessCertificateSection — the "Certificates" list on the FlowSuccessScreen.
//
// Certificates are inspection-only (the `inspection_attachments` table). Each
// attached certificate renders as a row with an "Attached" pill; the "Add
// certificate" row opens the EXISTING CertificatesManager pushed screen — we do
// not build a new picker. The list is a presentational mirror of the items the
// route loads; tapping a row / the add row is delegated to the route via
// `onOpen` / `onAdd` (which navigate to /inspections/[id]/certificates).
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FileText, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Badge } from '../primitives/Badge';
import { useTheme, type Theme } from '../../lib/theme';
import { SuccessListRow, RowLead } from './SuccessListRow';

export interface SuccessCertificateItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface Props {
  items: SuccessCertificateItem[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}

export function SuccessCertificateSection({ items, onOpen, onAdd }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('success.certificates.heading')}</Text>
      <View style={styles.list}>
        {items.map((c, i) => (
          <SuccessListRow
            key={c.id}
            isFirst={i === 0}
            lead={<RowLead icon={FileText} />}
            title={c.title}
            subtitle={c.subtitle}
            onPress={() => onOpen(c.id)}
            trailing={
              <>
                <Badge variant="success">{t('success.certificates.attached')}</Badge>
                <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.8} />
              </>
            }
          />
        ))}
        <SuccessListRow
          accent
          isFirst={items.length === 0}
          lead={<RowLead icon={Plus} dashed />}
          title={t('success.certificates.add')}
          subtitle={t('success.certificates.addHint')}
          onPress={onAdd}
        />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { marginTop: 24 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.inkFaint, marginBottom: 8, paddingHorizontal: 4 },
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
  });
}
