import { Pressable, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
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
      {DOC_TYPES.map(({ type, Icon }) => {
        const selected = docType === type;
        return (
          <Pressable
            key={type}
            onPress={() => setDocType(type)}
            style={[
              s.typeCard,
              showError && { borderColor: theme.colors.danger },
              selected && s.typeCardSelected,
            ]}
          >
            <View style={[s.typeIcon, selected && s.typeIconSelected]}>
              <Icon
                size={22}
                color={selected ? theme.colors.white : theme.colors.accent}
                strokeWidth={1.5}
              />
            </View>
            <Text style={[s.typeLabel, selected && { color: theme.colors.accent, fontWeight: '700' }]}>
              {ORDER_DOCUMENT_TYPE_LABEL[type]}
            </Text>
            {selected && (
              <CircleCheck size={22} color={theme.colors.accent} strokeWidth={1.5} />
            )}
          </Pressable>
        );
      })}
      {showError && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger, marginTop: 2 }}>
          {t('orders.selectDocType')}
        </Text>
      )}
    </View>
  );
}
