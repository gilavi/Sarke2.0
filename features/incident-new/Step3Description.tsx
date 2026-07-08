import React from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { User, CircleX, Plus, Camera } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { IconButton } from '../../components/primitives/IconButton';
import { IncidentField } from './IncidentField';
import type { IncidentPhoto } from './incidentFormSchema';
import type { IncidentStyles } from './styles';

// Hoisted so the witness-name IncidentField's memo isn't defeated by a fresh
// style object on every Step3 render.
const WITNESS_INPUT_STYLE = { marginBottom: 0 };

// ─── Step 3 - description ─────────────────────────────────────────────────────

export const Step3Description = React.memo(function Step3Description({
  description, cause, actionsTaken, witnesses, photos,
  setDescription, setCause, setActionsTaken,
  theme, s, attempted, registerField,
  witnessInput, setWitnessInput, onAddWitness, onRemoveWitness,
  onAddPhoto, onRemovePhoto, t,
}: {
  description: string;
  cause: string;
  actionsTaken: string;
  witnesses: string[];
  photos: IncidentPhoto[];
  setDescription: (v: string) => void;
  setCause: (v: string) => void;
  setActionsTaken: (v: string) => void;
  theme: any;
  s: IncidentStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  witnessInput: string;
  setWitnessInput: (v: string) => void;
  onAddWitness: () => void;
  onRemoveWitness: (i: number) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
  t: (key: string) => string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step3Title')}</Text>

      <View onLayout={registerField('description')}>
        <IncidentField
          label={t('incidents.fieldWhatHappened')}
          required
          value={description}
          onChangeText={setDescription}
          error={attempted && !description.trim() ? t('errors.requiredField') : undefined}
          multiline
          numberOfLines={4}
        />
      </View>

      <View onLayout={registerField('cause')}>
        <IncidentField
          label={t('incidents.fieldProbableCause')}
          required
          value={cause}
          onChangeText={setCause}
          error={attempted && !cause.trim() ? t('errors.requiredField') : undefined}
          multiline
          numberOfLines={3}
        />
      </View>

      <IncidentField
        label={t('incidents.fieldActionsTaken')}
        value={actionsTaken}
        onChangeText={setActionsTaken}
        multiline
        numberOfLines={3}
      />

      {/* Witnesses */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>{t('incidents.sectionWitnesses')}</Text>
        <WitnessList witnesses={witnesses} onRemove={onRemoveWitness} theme={theme} s={s} />
        <View style={s.witnessInputRow}>
          <View style={{ flex: 1 }}>
            <IncidentField
              label={t('incidents.fieldWitnessName')}
              value={witnessInput}
              onChangeText={setWitnessInput}
              onSubmitEditing={onAddWitness}
              returnKeyType="done"
              style={WITNESS_INPUT_STYLE}
            />
          </View>
          <IconButton
            icon={Plus}
            onPress={onAddWitness}
            a11yLabel={t('incidents.addWitnessA11y')}
            variant="outline"
            shape="square"
            size="xl"
          />
        </View>
      </View>

      {/* Photos */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>{t('incidents.sectionPhotos')}</Text>
        <PhotoGrid photos={photos} onRemove={onRemovePhoto} theme={theme} s={s} />
        <Pressable onPress={onAddPhoto} style={s.addPhotoBtn}>
          <Camera size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={s.addPhotoBtnText}>{t('incidents.addPhoto')}</Text>
        </Pressable>
      </View>
    </View>
  );
});

// Existing-witness rows. Memoized so typing in the description/cause fields (or
// the live witness-name input) doesn't reconcile the whole list.
const WitnessList = React.memo(function WitnessList({
  witnesses, onRemove, theme, s,
}: {
  witnesses: string[];
  onRemove: (i: number) => void;
  theme: any;
  s: IncidentStyles;
}) {
  return (
    <>
      {witnesses.map((w, i) => (
        <View key={`${i}-${w}`} style={s.witnessRow}>
          <User size={15} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={s.witnessName}>{w}</Text>
          <Pressable onPress={() => onRemove(i)} hitSlop={12}>
            <CircleX size={18} color={theme.colors.danger} strokeWidth={1.5} />
          </Pressable>
        </View>
      ))}
    </>
  );
});

// Photo thumbnails. Memoized so keystrokes elsewhere in the step don't
// reconcile the (expensive) image grid.
const PhotoGrid = React.memo(function PhotoGrid({
  photos, onRemove, theme, s,
}: {
  photos: IncidentPhoto[];
  onRemove: (i: number) => void;
  theme: any;
  s: IncidentStyles;
}) {
  if (photos.length === 0) return null;
  return (
    <View style={s.photoGrid}>
      {photos.map((photo, i) => (
        <View key={`${i}-${photo.uri}`} style={s.photoThumb}>
          <Image
            source={{ uri: photo.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            onPress={() => onRemove(i)}
            style={s.photoRemoveBtn}
            hitSlop={12}
          >
            <CircleX size={20} color={theme.colors.white} strokeWidth={1.5} />
          </Pressable>
        </View>
      ))}
    </View>
  );
});
