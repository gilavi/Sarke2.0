import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { SheetLayout } from './SheetLayout';
import { SignatureBlock, type SignatoryData } from './inspection';

interface Props {
  inspectionId: string;
  initialSignatories: SignatoryData[];
  extraFields?: { key: string; label: string }[];
  onClose: () => void;
  onSignatoriesChange: (signatories: SignatoryData[]) => void;
}

export function LocalSignaturesSheet({
  inspectionId,
  initialSignatories,
  extraFields,
  onClose,
  onSignatoriesChange,
}: Props) {
  const [signatories, setSignatories] = useState<SignatoryData[]>(initialSignatories);

  const handleChange = useCallback(
    (idx: number, field: string, value: string) => {
      setSignatories(prev => {
        const next = [...prev];
        if (field.startsWith('extra.')) {
          const key = field.slice(6);
          next[idx] = {
            ...next[idx],
            extra: { ...(next[idx].extra ?? {}), [key]: value },
          };
        } else {
          (next[idx] as any)[field] = field === 'signature' ? (value || null) : value;
        }
        onSignatoriesChange(next);
        return next;
      });
    },
    [onSignatoriesChange],
  );

  const handleSign = useCallback(
    (idx: number, base64Png: string) => {
      const next = signatories.map((s, i) =>
        i === idx ? { ...s, signature: base64Png, date: new Date().toISOString() } : s,
      );
      setSignatories(next);
      onSignatoriesChange(next);
    },
    [signatories, onSignatoriesChange],
  );

  const signedCount = signatories.filter(s => !!s.signature).length;

  return (
    <SheetLayout
      header={{ title: `ხელმოწერები (${signedCount}/${signatories.length})`, onClose }}
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <SignatureBlock
          signatories={signatories}
          onChange={handleChange}
          onSign={handleSign}
          extraFields={extraFields}
        />
      </View>
    </SheetLayout>
  );
}
