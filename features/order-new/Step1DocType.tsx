import { Pressable, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import type { OrderDocumentType } from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';
import { DOC_TYPES } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step1DocType({
  docType, setDocType, theme, s,
}: {
  docType: OrderDocumentType | null;
  setDocType: (t: OrderDocumentType) => void;
  theme: any;
  s: OrderStyles;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>ბრძანების ტიპი</Text>
      {DOC_TYPES.map(({ type, Icon }) => {
        const selected = docType === type;
        return (
          <Pressable
            key={type}
            onPress={() => setDocType(type)}
            style={[s.typeCard, selected && s.typeCardSelected]}
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
    </View>
  );
}
