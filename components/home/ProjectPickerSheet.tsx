import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { ProjectAvatar } from '../ProjectAvatar';
import { InspectionTypeAvatar } from '../InspectionTypeAvatar';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { LocationRow } from '../LocationRow';
import { MapPickerInline } from '../MapPickerInline';
import { Button } from '../ui';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { pickProjectLogo } from '../../lib/projectLogo';
import {
  questionnairesApi,
  projectsApi,
} from '../../lib/services';
import { bobcatApi }              from '../../lib/bobcatService';
import { excavatorApi }           from '../../lib/excavatorService';
import { generalEquipmentApi }    from '../../lib/generalEquipmentService';
import { cargoPlatformApi }       from '../../lib/cargoPlatformService';
import { safetyNetApi }           from '../../lib/safetyNetService';
import { mobileLadderApi }        from '../../lib/mobileLadderService';
import { fallProtectionApi }      from '../../lib/fallProtectionService';
import { liftingAccessoriesApi }  from '../../lib/liftingAccessoriesService';
import { forkliftApi }            from '../../lib/forkliftService';
import { routeForInspection } from '../../lib/inspectionRouting';
import { useToast } from '../../lib/toast';
import { useTheme, withOpacity, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { friendlyError } from '../../lib/errorMap';
import { useTranslation } from 'react-i18next';
import type { LatLng } from '../MapPicker';
import type { Project, Template } from '../../types/models';

// ───────── ANIMATED DARK BACKDROP ─────────

function AnimatedDarkBackdrop({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: theme.colors.overlay },
        visible ? { opacity: 1 } : { opacity: 0 },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {visible && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onPress}
          {...a11y('დახურვა', 'შეეხეთ ფონის დასახურად', 'button')}
        />
      )}
    </View>
  );
}

// ───────── PROJECT PICKER SHEET ─────────

export interface ProjectPickerSheetProps {
  visible: boolean;
  initialView?: 'list' | 'new';
  action?: 'inspection' | 'incident' | 'briefing' | 'report';
  projects: Project[];
  templates: Template[];
  preselectedTemplateId?: string | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onProjectCreated?: (id: string) => void;
}

export function ProjectPickerSheet({
  visible,
  initialView = 'list',
  action = 'inspection',
  projects,
  templates,
  preselectedTemplateId = null,
  onClose,
  onCreated,
  onProjectCreated,
}: ProjectPickerSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pickerStyles = useMemo(() => getPickerStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();

  const [view, setView]                   = useState<'list' | 'new'>('list');
  const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);
  const pickedTemplateIdRef = useRef<string | null>(null);
  useEffect(() => { pickedTemplateIdRef.current = pickedTemplateId; }, [pickedTemplateId]);

  const [company, setCompany]     = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [pin, setPin]             = useState<LatLng | null>(null);
  const [logo, setLogo]           = useState<string | null>(null);
  const [busy, setBusy]           = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const keyboardMargin            = useSheetKeyboardMargin();

  // Reset form + view every time the sheet opens or props change
  useEffect(() => {
    if (visible) {
      setView(initialView);
      setPickedTemplateId(preselectedTemplateId ?? null);
      setCompany('');
      setPhone('');
      setAddress('');
      setPin(null);
      setLogo(null);
      setBusy(false);
      setMapVisible(false);
    }
  }, [visible, initialView, preselectedTemplateId]);

  const onPickLogo = async () => {
    const next = await pickProjectLogo();
    if (next) setLogo(next);
  };

  const onProjectPicked = (projectId: string) => {
    if (action !== 'inspection') {
      const route =
        action === 'incident'  ? `/incidents/new?projectId=${projectId}` :
        action === 'briefing'  ? `/briefings/new?projectId=${projectId}` :
                                 `/reports/new?projectId=${projectId}`;
      onClose();
      router.push(route as any);
      return;
    }
    const tplId = pickedTemplateIdRef.current;
    if (!tplId) {
      toast.error(t('errors.notFoundTemplate'));
      return;
    }
    void startInspection(projectId, tplId);
  };

  const startInspection = async (projectId: string, templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    try {
      let newId: string;
      if (tpl?.category === 'bobcat') {
        newId = (await bobcatApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'excavator') {
        newId = (await excavatorApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'general_equipment') {
        newId = (await generalEquipmentApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'cargo_platform') {
        newId = (await cargoPlatformApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'safety_net_inspection') {
        newId = (await safetyNetApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'mobile_ladder_inspection') {
        newId = (await mobileLadderApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'fall_protection_inspection') {
        newId = (await fallProtectionApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'lifting_accessories_inspection') {
        newId = (await liftingAccessoriesApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'forklift_inspection') {
        newId = (await forkliftApi.create({ projectId, templateId })).id;
      } else {
        newId = (await questionnairesApi.create({ projectId, templateId })).id;
      }
      onClose();
      router.push(routeForInspection(tpl?.category, newId, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    }
  };

  const createProject = async () => {
    if (!company.trim() || !phone.trim() || !address.trim()) return;
    setBusy(true);
    try {
      const created = await projectsApi.create({
        name: company.trim(),
        companyName: company.trim(),
        address: address.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        logo,
        contactPhone: phone.trim() || null,
      });
      // Fire-and-forget so the new project screen opens immediately
      void onCreated();
      if (created?.id) {
        setCompany('');
        setPhone('');
        setAddress('');
        setPin(null);
        setLogo(null);
        if (action === 'inspection') {
          const tplId = pickedTemplateIdRef.current;
          if (tplId) {
            await startInspection(created.id, tplId);
            return;
          }
        }
        if (onProjectCreated) {
          onProjectCreated(created.id);
        } else {
          onClose();
        }
      } else {
        onClose();
        toast.success(t('notifications.projectCreated'));
      }
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={() => (mapVisible ? setMapVisible(false) : onClose())}
      statusBarTranslucent
    >
      <View style={pickerStyles.container}>
        <AnimatedDarkBackdrop
          visible={visible}
          onPress={() => (mapVisible ? setMapVisible(false) : onClose())}
        />
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable style={[pickerStyles.card, { maxHeight: '90%' }]} onPress={() => {}}>
            <View style={pickerStyles.handle} />

            {view === 'list' ? (
              <>
                {/* Sheet header */}
                <View style={pickerStyles.sheetHeader}>
                  {pickedTemplateId ? (
                    <InspectionTypeAvatar
                      category={templates.find(t => t.id === pickedTemplateId)?.category}
                      size={36}
                    />
                  ) : null}
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>
                    {t('home.startInspectionSheetTitle')}
                  </Text>
                  <Pressable onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {projects.length === 0 ? (
                  <>
                    <Pressable onPress={() => setView('new')} style={pickerStyles.addNewRow}>
                      <View style={pickerStyles.addNewIcon}>
                        <Ionicons name="add" size={18} color={theme.colors.accent} />
                      </View>
                      <Text style={pickerStyles.addNewText}>{t('home.addNewProjectSheet')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
                    </Pressable>
                    <View style={pickerStyles.emptyState}>
                      <Ionicons name="folder-open-outline" size={36} color={theme.colors.inkFaint} />
                      <Text style={pickerStyles.emptyText}>{t('home.noProjectsYet')}</Text>
                      <Text style={pickerStyles.emptySubText}>{t('home.noProjectsHint')}</Text>
                    </View>
                  </>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 380 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable onPress={() => setView('new')} style={pickerStyles.addNewRow}>
                      <View style={pickerStyles.addNewIcon}>
                        <Ionicons name="add" size={18} color={theme.colors.accent} />
                      </View>
                      <Text style={pickerStyles.addNewText}>{t('home.addNewProjectSheet')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
                    </Pressable>
                    {projects.slice(0, 20).map(p => (
                      <Pressable
                        key={p.id}
                        onPress={() => onProjectPicked(p.id)}
                        style={pickerStyles.projectRow}
                      >
                        <ProjectAvatar project={p} size={44} />
                        <View style={{ flex: 1 }}>
                          <Text style={pickerStyles.rowName} numberOfLines={1}>
                            {p.company_name || p.name}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                {/* New project form */}
                <View style={pickerStyles.sheetHeader}>
                  <Pressable
                    onPress={() => setView('list')}
                    hitSlop={12}
                    style={{ marginRight: 10 }}
                  >
                    <Ionicons name="arrow-back" size={22} color={theme.colors.accent} />
                  </Pressable>
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>
                    {t('home.newProjectFormTitle')}
                  </Text>
                  <Pressable onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: '72%' }}
                  contentContainerStyle={{ paddingTop: 4, paddingBottom: 8, gap: 16 }}
                >
                  <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <ProjectAvatar
                      project={{ name: company || '—', logo }}
                      size={88}
                      editable
                      onEdit={onPickLogo}
                    />
                    <Pressable
                      onPress={onPickLogo}
                      hitSlop={13}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons
                        name={logo ? 'pencil' : 'add-circle-outline'}
                        size={15}
                        color={theme.colors.accent}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>
                        {logo ? t('projects.changePhoto') : t('projects.addPhoto')}
                      </Text>
                    </Pressable>
                  </View>
                  <FloatingLabelInput
                    label={t('common.company')}
                    required
                    value={company}
                    onChangeText={setCompany}
                    autoFocus
                  />
                  <FloatingLabelInput
                    label={t('common.phone')}
                    required
                    value={phone}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '').slice(0, 9);
                      let formatted = digits;
                      if (digits.length > 3 && digits.length <= 5) {
                        formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
                      } else if (digits.length > 5 && digits.length <= 7) {
                        formatted = `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
                      } else if (digits.length > 7) {
                        formatted = `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
                      }
                      setPhone(formatted);
                    }}
                    keyboardType="phone-pad"
                  />
                  <FloatingLabelInput
                    label={t('common.address')}
                    required
                    value={address}
                    onChangeText={setAddress}
                    {...a11y(t('common.address'), 'შეიყვანეთ მისამართი', 'text')}
                  />
                  <LocationRow
                    pin={pin}
                    address={address}
                    onPress={() => { Keyboard.dismiss(); setMapVisible(true); }}
                  />
                </ScrollView>

                <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: insets.bottom || 16 }}>
                  <Button
                    title={t('projects.createButton')}
                    onPress={createProject}
                    loading={busy}
                    disabled={!company.trim() || !phone.trim() || !address.trim()}
                    {...a11y(t('projects.createButton'), 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Full-screen map overlay */}
        {mapVisible && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background }]}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingTop: insets.top + 12,
              paddingVertical: 12,
            }}>
              <View style={{ width: 24 }} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
                მდებარეობის არჩევა
              </Text>
              <Pressable
                onPress={() => setMapVisible(false)}
                hitSlop={12}
                {...a11y('დახურვა', 'რუკის დახურვა', 'button')}
              >
                <Ionicons name="close" size={24} color={theme.colors.ink} />
              </Pressable>
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
        )}
      </View>
    </Modal>
  );
}

// ───────── STYLES ─────────

function getPickerStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 16,
      paddingTop: 10,
      paddingBottom: 44,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.hairline,
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.ink,
    },
    projectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    addNewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.cardInner,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: withOpacity(theme.colors.accent, 0.2),
    },
    addNewIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addNewText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 6,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
      marginTop: 8,
    },
    emptySubText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
    },
  });
}
