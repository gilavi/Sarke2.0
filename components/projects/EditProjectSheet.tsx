import { useCallback, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { A11yText as Text } from '../primitives/A11yText';
import { SheetLayout } from '../SheetLayout';
import { ProjectAvatar } from '../ProjectAvatar';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { GeocodingAddressInput } from '../inputs/GeocodingAddressInput';
import { HeaderCloseButton } from '../HeaderCloseButton';
import { LocationRow } from '../LocationRow';
import { MapPickerInline } from '../MapPickerInline';
import { Button } from '../ui';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { pickProjectLogo } from '../../lib/projectLogo';
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { friendlyError } from '../../lib/errorMap';
import { useTranslation } from 'react-i18next';
import type { LatLng } from '../MapPicker';
import type { Project } from '../../types/models';

interface EditProjectSheetProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

export function EditProjectSheet({
  visible,
  project,
  onClose,
  onSaved,
}: EditProjectSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [company, setCompany]       = useState('');
  const [address, setAddress]       = useState('');
  const [phone, setPhone]           = useState('');
  const [pin, setPin]               = useState<LatLng | null>(null);
  const [logo, setLogo]             = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const keyboardMargin              = useSheetKeyboardMargin();
  const { attempted, guard }        = useSubmitGuard();

  // Sync form when modal opens or project changes
  useFocusEffect(
    useCallback(() => {
      if (visible && project) {
        setCompany(project.company_name || project.name);
        setAddress(project.address ?? '');
        setPhone(project.contact_phone ?? '');
        setPin(
          project.latitude != null && project.longitude != null
            ? { latitude: project.latitude, longitude: project.longitude }
            : null,
        );
        setLogo(project.logo ?? null);
      }
    }, [visible, project]),
  );

  const onPickLogo = async () => {
    const next = await pickProjectLogo();
    if (next) setLogo(next);
  };

  const save = async () => {
    if (!project || !company.trim()) return;
    setBusy(true);
    try {
      const saved = await projectsApi.update(project.id, {
        name: company.trim(),
        company_name: company.trim(),
        address: address.trim() || null,
        contact_phone: phone.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        logo,
      });
      onSaved(saved);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => (mapVisible ? setMapVisible(false) : onClose())}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]}
          onPress={() => (mapVisible ? setMapVisible(false) : onClose())}
          {...a11y(t('common.close'), t('projects.closeBackdrop'), 'button')}
        />
        {/* Card - marginBottom rides the iOS keyboard 1:1 */}
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <SheetLayout
              insideBottomSheet
              maxHeightRatio={0.92}
              header={{ title: t('projects.edit'), onClose }}
              footer={
                <Button
                  title={t('common.save')}
                  size="lg"
                  onPress={() => guard(!!company.trim(), save)}
                  loading={busy}
                />
              }
            >
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                <ProjectAvatar
                  project={{ name: company, logo }}
                  size={88}
                  editable
                  onEdit={onPickLogo}
                />
                {logo ? (
                  <Pressable onPress={() => setLogo(null)} hitSlop={13}>
                    <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>
                      {t('projects.logoRemove')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <FloatingLabelInput
                label={t('common.company')}
                required
                value={company}
                onChangeText={setCompany}
                error={attempted && !company.trim() ? t('errors.requiredField') : undefined}
                autoFocus
              />

              <GeocodingAddressInput
                label={t('common.address')}
                value={address}
                onChangeText={setAddress}
                onPin={setPin}
              />

              <FloatingLabelInput
                label={t('projects.contactPhone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <LocationRow
                pin={pin}
                address={address}
                onPress={() => { Keyboard.dismiss(); setMapVisible(true); }}
              />
            </SheetLayout>
          </Pressable>
        </Animated.View>

        {/* Full-screen map overlay */}
        {mapVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 24,
                paddingTop: insets.top + 12,
                paddingVertical: 12,
              }}>
                <View style={{ width: 38 }} />
                <Text style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 17, fontWeight: '700', color: theme.colors.ink,
                }}>
                  {t('projects.chooseLocation')}
                </Text>
                <HeaderCloseButton onPress={() => setMapVisible(false)} />
              </View>
              <MapPickerInline
                initialPin={pin}
                initialAddress={address}
                onConfirm={(newPin, newAddress) => {
                  setPin(newPin);
                  setAddress(newAddress);
                  setMapVisible(false);
                }}
                onCancel={() => setMapVisible(false)}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
