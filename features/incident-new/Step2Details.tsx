import React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { DateTimeField } from '../../components/DateTimeField';
import type { IncidentType } from '../../types/models';
import { IncidentField } from './IncidentField';
import type { IncidentStyles } from './styles';

// ─── Step 2 - person + details ────────────────────────────────────────────────

export const Step2Details = React.memo(function Step2Details({
  type, injuredName, injuredRole, dateTime, location,
  setInjuredName, setInjuredRole, setDateTime, setLocation,
  theme, s, attempted, registerField, t,
}: {
  type: IncidentType | null;
  injuredName: string;
  injuredRole: string;
  dateTime: Date;
  location: string;
  setInjuredName: (v: string) => void;
  setInjuredRole: (v: string) => void;
  setDateTime: (v: Date) => void;
  setLocation: (v: string) => void;
  theme: any;
  s: IncidentStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  t: (key: string) => string;
}) {
  const isNearMiss = type === 'nearmiss';

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step2Title')}</Text>

      {isNearMiss ? (
        <View style={s.nearMissNote}>
          <Info size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={s.nearMissNoteText}>
            {t('incidents.nearMissNoteShort')}
          </Text>
        </View>
      ) : (
        <>
          <IncidentField
            label={t('incidents.fieldInjuredName')}
            value={injuredName}
            onChangeText={setInjuredName}
          />

          <IncidentField
            label={t('incidents.fieldInjuredRole')}
            value={injuredRole}
            onChangeText={setInjuredRole}
          />
        </>
      )}

      <DateTimeField
        label={t('incidents.fieldDateTime')}
        value={dateTime}
        onChange={setDateTime}
        mode="datetime"
        maxDate={new Date()}
      />

      {/* Location */}
      <View onLayout={registerField('location')}>
        <IncidentField
          label={t('incidents.fieldLocationExact')}
          required
          value={location}
          onChangeText={setLocation}
          error={attempted && !location.trim() ? t('errors.requiredField') : undefined}
        />
      </View>
    </View>
  );
});
