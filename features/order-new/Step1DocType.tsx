import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Selector } from '../../components/ui/Selector';
import type { OrderDocumentType } from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';
import { DOC_TYPES } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step1DocType({
  docType, setDocType, theme, s, attempted,
}: {
  docType: OrderDocumentType | null;
  setDocType: (t: OrderDocumentType) => void;
  theme: any;
  s: OrderStyles;
  attempted: boolean;
}) {
  const { t } = useTranslation();
  const showError = attempted && docType === null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.docType')}</Text>
      <Selector
        presentation="rows"
        indicator="check"
        value={docType}
        onChange={(v) => setDocType(v as OrderDocumentType)}
        error={showError}
        options={DOC_TYPES.map(({ type, Icon }) => ({
          value: type,
          label: ORDER_DOCUMENT_TYPE_LABEL[type],
          icon: Icon,
        }))}
      />
      {showError && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger, marginTop: 2 }}>
          {t('orders.selectDocType')}
        </Text>
      )}
    </View>
  );
}
