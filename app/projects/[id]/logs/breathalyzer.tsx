import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonListCard } from '../../../../components/Skeleton';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Plus,
  X,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Circle,
  CircleAlert,
  BookOpen,
  Share2,
  Pencil,
  Ban,
  Cpu,
  CornerDownRight,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { A11yText as Text } from '../../../../components/primitives/A11yText';
import { Button } from '../../../../components/ui';
import { FloatingLabelInput } from '../../../../components/inputs/FloatingLabelInput';
import { SignatureCanvas } from '../../../../components/SignatureCanvas';
import { useTheme } from '../../../../lib/theme';
import { useToast } from '../../../../lib/toast';
import { a11y } from '../../../../lib/accessibility';
import { useProject } from '../../../../lib/apiHooks';
import { qk } from '../../../../lib/apiHooks';
import {
  breathalyzerLogApi,
  makeBLEntry,
  peoplePoolApi,
} from '../../../../lib/breathalyzerLogService';
import { buildBreathalizerLogPdfHtml } from '../../../../lib/breathalyzerLogPdf';
import { generateAndSharePdf } from '../../../../lib/pdfOpen';
import {
  BL_RESULT_COLORS,
  countsByStatus,
  formatBlDate,
  resultStatusFromValue,
  type BLEntry,
  type BLStatus,
  type BLTestType,
  type BreathalizerLog,
  type PoolPerson,
} from '../../../../types/breathalyzerLog';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function todayDisplay() {
  return formatBlDate(TODAY);
}

function timeDisplay(iso: string) {
  return new Date(iso).toLocaleTimeString('ka-GE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseResult(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? 0 : Math.max(0, n);
}

function daysSince(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000,
  );
  if (diff === 0) return 'დღეს';
  if (diff === 1) return '1 დ.';
  return `${diff} დ.`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BreathalizerJournalScreen() {
  const { id: projectId, logId: paramLogId } =
    useLocalSearchParams<{ id: string; logId?: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const projectQ = useProject(projectId);
  const project = projectQ.data;

  // ── Log state ──────────────────────────────────────────────────────────────
  const [log, setLog] = useState<BreathalizerLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [serialInput, setSerialInput] = useState('');
  const [serialFocus, setSerialFocus] = useState(false);

  // ── People pool ────────────────────────────────────────────────────────────
  const [pool, setPool] = useState<PoolPerson[]>([]);

  // ── Add-entry modal ────────────────────────────────────────────────────────
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [repeatFor, setRepeatFor] = useState<BLEntry | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);

  // Step 1
  const [search, setSearch] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryPosition, setEntryPosition] = useState('');
  const searchRef = useRef<TextInput>(null);

  // Step 2
  const [entryTestType, setEntryTestType] = useState<BLTestType>('primary');

  // Step 3
  const [entryResultRaw, setEntryResultRaw] = useState('0.00');
  const [showRepeatPrompt, setShowRepeatPrompt] = useState(false);

  // Step 4
  const [entrySignature, setEntrySignature] = useState<string | null>(null);
  const [entryRefusedSig, setEntryRefusedSig] = useState(false);

  // Signature canvas (reused for entry + responsible person)
  const [showSigCanvas, setShowSigCanvas] = useState(false);
  const [sigTarget, setSigTarget] = useState<'entry' | 'responsible'>('entry');

  // ── Close-shift modal ──────────────────────────────────────────────────────
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [respName, setRespName] = useState('');
  const [respSig, setRespSig] = useState<string | null>(null);
  const [closingShift, setClosingShift] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLog();
    loadPool();
  }, [projectId, paramLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLog() {
    setLoading(true);
    try {
      let loaded: BreathalizerLog | null = null;
      if (paramLogId) {
        loaded = await breathalyzerLogApi.getById(paramLogId);
      } else {
        loaded = await breathalyzerLogApi.getByProjectAndDate(projectId, TODAY);
      }
      setLog(loaded);
      if (loaded) setSerialInput(loaded.deviceSerialNumber ?? '');
    } catch {
      toast.error('ჟურნალის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }

  async function loadPool() {
    const p = await peoplePoolApi.load(projectId);
    setPool(p);
  }

  // ── Start log ──────────────────────────────────────────────────────────────
  async function startLog() {
    try {
      const created = await breathalyzerLogApi.create({
        projectId,
        date: TODAY,
      });
      setLog(created);
      setSerialInput('');
      invalidateLogsCache();
    } catch {
      toast.error('ჟურნალის შექმნა ვერ მოხერხდა');
    }
  }

  // ── Serial number ──────────────────────────────────────────────────────────
  async function saveSerial() {
    if (!log) return;
    const trimmed = serialInput.trim() || null;
    try {
      await breathalyzerLogApi.patchDeviceSerial(log.id, trimmed);
      setLog({ ...log, deviceSerialNumber: trimmed });
    } catch {
      // Non-fatal
    }
  }

  // ── Add entry helpers ──────────────────────────────────────────────────────
  function openAddEntry(prefilledRepeat?: BLEntry) {
    setRepeatFor(prefilledRepeat ?? null);
    setSearch('');
    setEntryName(prefilledRepeat?.personName ?? '');
    setEntryPosition(prefilledRepeat?.position ?? '');
    setEntryTestType(prefilledRepeat ? 'repeat' : 'primary');
    setEntryResultRaw('0.00');
    setEntrySignature(null);
    setEntryRefusedSig(false);
    setShowRepeatPrompt(false);
    setAddStep(prefilledRepeat ? 2 : 1);
    setShowAddEntry(true);
  }

  function dismissAddEntry() {
    setShowAddEntry(false);
    setShowRepeatPrompt(false);
  }

  function selectSuggestion(p: PoolPerson) {
    setEntryName(p.name);
    setEntryPosition(p.position);
    setSearch(p.name);
    Keyboard.dismiss();
  }

  async function saveEntry() {
    if (!log) return;
    const result = parseResult(entryResultRaw);
    const status = resultStatusFromValue(result);

    setSavingEntry(true);
    try {
      const newEntry = makeBLEntry({
        order: log.entries.length + 1,
        personName: entryName.trim(),
        position: entryPosition.trim(),
        testType: entryTestType,
        result,
        signature: entrySignature,
        refusedSignature: entryRefusedSig,
        time: new Date().toISOString(),
        relatedEntryId: repeatFor?.id ?? null,
      });

      const nextEntries = [...log.entries, newEntry];
      await breathalyzerLogApi.patchEntries(log.id, nextEntries);

      // Upsert to people pool
      await peoplePoolApi.upsert(projectId, {
        name: entryName.trim(),
        position: entryPosition.trim(),
      });
      const updatedPool = await peoplePoolApi.load(projectId);
      setPool(updatedPool);

      const updatedLog = { ...log, entries: nextEntries };
      setLog(updatedLog);
      invalidateLogsCache();
      setShowAddEntry(false);

      // Prompt repeat test if FAIL
      if (status === 'fail') {
        setTimeout(() => {
          setRepeatFor(newEntry);
          setShowRepeatPrompt(true);
        }, 300);
      }
    } catch {
      toast.error('შენახვა ვერ მოხერხდა');
    } finally {
      setSavingEntry(false);
    }
  }

  // ── Close shift ────────────────────────────────────────────────────────────
  async function closeShift() {
    if (!log) return;
    setClosingShift(true);
    try {
      const htmlStr = await buildBreathalizerLogPdfHtml({
        log: {
          ...log,
          responsiblePerson: { name: respName.trim(), signature: respSig },
        },
        projectName: project?.name ?? project?.company_name ?? 'პროექტი',
        companyName: project?.company_name ?? '',
      });

      await breathalyzerLogApi.close(
        log.id,
        { name: respName.trim(), signature: respSig },
      );

      const updatedLog: BreathalizerLog = {
        ...log,
        status: 'closed',
        responsiblePerson: { name: respName.trim(), signature: respSig },
      };
      setLog(updatedLog);
      invalidateLogsCache();
      setShowCloseShift(false);
      toast.success('ცვლა დასრულდა');

      // Generate and share PDF
      await generateAndSharePdf(
        htmlStr,
        `alkotest-${log.date}.pdf`,
        undefined,
      );
    } catch {
      toast.error('შეცდომა - გთხოვთ სცადოთ ხელახლა');
    } finally {
      setClosingShift(false);
    }
  }

  function invalidateLogsCache() {
    queryClient.invalidateQueries({
      queryKey: qk.breathalyzerLog.byProject(projectId),
    });
  }

  // ── Suggestions for step 1 ────────────────────────────────────────────────
  const crewSuggestions = useMemo<PoolPerson[]>(() => {
    const crew = project?.crew ?? [];
    return crew
      .filter(c => !pool.find(p => p.name.toLowerCase() === c.name?.toLowerCase()))
      .map(c => ({
        name: c.name ?? '',
        position: c.role ?? '',
        lastTestedAt: '',
        testCount: 0,
      }))
      .filter(c => c.name);
  }, [project?.crew, pool]);

  const allSuggestions = useMemo<PoolPerson[]>(
    () => [...pool, ...crewSuggestions],
    [pool, crewSuggestions],
  );

  const filteredSuggestions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allSuggestions.slice(0, 8);
    return allSuggestions
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [allSuggestions, search]);

  // ── Result colors ─────────────────────────────────────────────────────────
  const resultValue = parseResult(entryResultRaw);
  const resultStatus = resultStatusFromValue(resultValue);
  const resultColors = BL_RESULT_COLORS[resultStatus];

  const resultLabel =
    resultStatus === 'safe'
      ? '✓ SAFE - სამუშაოდ დაშვება დაშვებულია'
      : resultStatus === 'warning'
        ? '⚠ WARNING - საჭიროა ზედამხედველობა'
        : '✗ FAIL - სამუშაოდ დაშვება აკრძალულია';

  // ── Entry can be saved ────────────────────────────────────────────────────
  const canSaveEntry =
    entryName.trim().length > 0 &&
    entryPosition.trim().length > 0 &&
    (entrySignature !== null || entryRefusedSig);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(
    () => countsByStatus(log?.entries ?? []),
    [log?.entries],
  );

  const isReadOnly = log?.status === 'closed';
  const isTodayLog = !paramLogId || log?.date === TODAY;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ალკოტესტი',
          headerBackTitle: '',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontWeight: '700', color: theme.colors.ink },
          headerRight: () =>
            log?.status === 'closed' ? (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>დასრულებული</Text>
              </View>
            ) : null,
        }}
      />

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonListCard rows={5} />
        </View>
      ) : !log ? (
        // ── No log for today ───────────────────────────────────────────────
        <View style={styles.center}>
          <BookOpen
            size={52}
            color={theme.colors.borderStrong}
            strokeWidth={1.5}
          />
          <Text style={styles.emptyTitle}>
            {isTodayLog
              ? 'დღეს ჯერ ჩანაწერი არ დაწყებულა'
              : 'ჩანაწერი ვერ მოიძებნა'}
          </Text>
          {isTodayLog ? (
            <Pressable
              onPress={startLog}
              style={styles.startBtn}
              {...a11y('ჩანაწერის დაწყება', undefined, 'button')}
            >
              <Text style={styles.startBtnText}>
                დღევანდელი ჩანაწერის დაწყება
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {/* ── Info bar ─────────────────────────────────────────────────── */}
          <View style={styles.infoBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoDate}>
                {formatBlDate(log.date)}
              </Text>
            </View>
            <View style={styles.snRow}>
              <Cpu
                size={13}
                color={theme.colors.inkSoft}
                strokeWidth={1.5}
              />
              <TextInput
                style={styles.snInput}
                value={serialInput}
                onChangeText={setSerialInput}
                onFocus={() => setSerialFocus(true)}
                onBlur={() => {
                  setSerialFocus(false);
                  saveSerial();
                }}
                placeholder="S/N"
                placeholderTextColor={theme.colors.inkFaint}
                editable={!isReadOnly}
                returnKeyType="done"
                onSubmitEditing={saveSerial}
              />
            </View>
          </View>

          {/* ── Entry list ────────────────────────────────────────────────── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {log.entries.length === 0 ? (
              <View style={styles.emptyEntries}>
                <Text style={styles.emptyEntriesText}>
                  ჩანაწერი არ არის · დაიწყე +
                </Text>
              </View>
            ) : (
              log.entries.map((entry, idx) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  theme={theme}
                  styles={styles}
                />
              ))
            )}

            {/* FAIL repeat prompt */}
            {showRepeatPrompt && repeatFor ? (
              <View style={styles.repeatCard}>
                <CircleAlert size={20} color={BL_RESULT_COLORS.fail.text} strokeWidth={1.5} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.repeatCardTitle, { color: BL_RESULT_COLORS.fail.text }]}>
                    პირი ვერ დაიშვება სამუშაოდ
                  </Text>
                  <Text style={styles.repeatCardSub}>
                    განმეორებითი ტესტი 15 წუთში
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowRepeatPrompt(false);
                    openAddEntry(repeatFor);
                  }}
                  style={styles.repeatCardBtn}
                  {...a11y('განმეორებითი ტესტი', undefined, 'button')}
                >
                  <Text style={styles.repeatCardBtnText}>↩ ტესტი</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          {/* ── Bottom action bar ─────────────────────────────────────────── */}
          {!isReadOnly && (
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: insets.bottom + 8 },
              ]}
            >
              {log.entries.length > 0 && (
                <Pressable
                  onPress={() => {
                    setRespName('');
                    setRespSig(null);
                    setShowCloseShift(true);
                  }}
                  style={styles.closeShiftBtn}
                  {...a11y('ცვლის დასრულება', undefined, 'button')}
                >
                  <Text style={styles.closeShiftBtnText}>
                    ცვლის დასრულება
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => openAddEntry()}
                style={styles.addEntryBtn}
                {...a11y('ჩანაწერის დამატება', undefined, 'button')}
              >
                <Plus size={22} color={theme.colors.white} strokeWidth={1.5} />
                <Text style={styles.addEntryBtnText}>
                  ჩანაწერის დამატება
                </Text>
              </Pressable>
            </View>
          )}

          {/* Read-only: share PDF button */}
          {isReadOnly && (
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: insets.bottom + 8 },
              ]}
            >
              <Pressable
                onPress={async () => {
                  try {
                    const html = await buildBreathalizerLogPdfHtml({
                      log,
                      projectName:
                        project?.name ?? project?.company_name ?? 'პროექტი',
                      companyName: project?.company_name ?? '',
                    });
                    await generateAndSharePdf(
                      html,
                      `alkotest-${log.date}.pdf`,
                      undefined,
                    );
                  } catch {
                    toast.error('PDF გენერაცია ვერ მოხერხდა');
                  }
                }}
                style={styles.addEntryBtn}
                {...a11y('PDF გაზიარება', undefined, 'button')}
              >
                <Share2
                  size={20}
                  color={theme.colors.white}
                  strokeWidth={1.5}
                />
                <Text style={styles.addEntryBtnText}>PDF გაზიარება</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          Add Entry Modal
          ═════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showAddEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={dismissAddEntry}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable
              onPress={
                addStep > 1 ? () => setAddStep(s => s - 1) : dismissAddEntry
              }
              hitSlop={12}
              style={styles.modalBackBtn}
              {...a11y(addStep > 1 ? 'უკან' : 'გაუქმება', undefined, 'button')}
            >
              {addStep > 1 ? (
                <ChevronLeft
                  size={22}
                  color={theme.colors.ink}
                  strokeWidth={1.5}
                />
              ) : (
                <X
                  size={22}
                  color={theme.colors.ink}
                  strokeWidth={1.5}
                />
              )}
            </Pressable>
            <Text style={styles.modalTitle}>
              {addStep === 1
                ? 'პირი'
                : addStep === 2
                  ? 'ტესტის ტიპი'
                  : addStep === 3
                    ? 'შედეგი'
                    : 'ხელმოწერა'}
            </Text>
            <View style={styles.stepDots}>
              {[1, 2, 3, 4].map(s => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s === addStep && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {/* ── Step 1: Person ──────────────────────────────────────────── */}
            {addStep === 1 && (
              <View style={{ gap: 16 }}>
                <TextInput
                  ref={searchRef}
                  style={styles.searchInput}
                  value={search}
                  onChangeText={t => {
                    setSearch(t);
                    setEntryName(t);
                  }}
                  placeholder="სახელი / გვარი..."
                  placeholderTextColor={theme.colors.inkFaint}
                  autoFocus
                  returnKeyType="next"
                />

                {filteredSuggestions.length > 0 && (
                  <View style={styles.suggestionList}>
                    {filteredSuggestions.map((p, i) => (
                      <Pressable
                        key={i}
                        onPress={() => selectSuggestion(p)}
                        style={styles.suggestionRow}
                        {...a11y(p.name, undefined, 'button')}
                      >
                        <View style={styles.suggestionAvatar}>
                          <Text style={styles.suggestionInitials}>
                            {initials(p.name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionName}>{p.name}</Text>
                          <Text style={styles.suggestionPos}>{p.position}</Text>
                        </View>
                        {p.lastTestedAt ? (
                          <Text style={styles.suggestionDate}>
                            {daysSince(p.lastTestedAt)}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}

                <FloatingLabelInput
                  label="სახელი / გვარი"
                  required
                  value={entryName}
                  onChangeText={setEntryName}
                />
                <FloatingLabelInput
                  label="პოზიცია"
                  required
                  value={entryPosition}
                  onChangeText={setEntryPosition}
                />
              </View>
            )}

            {/* ── Step 2: Test type ───────────────────────────────────────── */}
            {addStep === 2 && (
              <View style={{ gap: 16 }}>
                {repeatFor ? (
                  <View style={styles.repeatLabel}>
                    <CornerDownRight
                      size={16}
                      color={theme.colors.accent}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[
                        styles.repeatLabelText,
                        { color: theme.colors.accent },
                      ]}
                    >
                      {entryName}-ის განმეორებითი ტესტი
                    </Text>
                  </View>
                ) : null}

                <View style={styles.typeChips}>
                  <Pressable
                    onPress={() => setEntryTestType('primary')}
                    style={[
                      styles.typeChip,
                      entryTestType === 'primary' && styles.typeChipActive,
                    ]}
                    {...a11y('პირველადი', undefined, 'button')}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        entryTestType === 'primary' &&
                          styles.typeChipTextActive,
                      ]}
                    >
                      პირველადი
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEntryTestType('repeat')}
                    style={[
                      styles.typeChip,
                      entryTestType === 'repeat' && styles.typeChipActive,
                    ]}
                    {...a11y('განმეორებითი', undefined, 'button')}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        entryTestType === 'repeat' && styles.typeChipTextActive,
                      ]}
                    >
                      ↩ განმეორებითი
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Step 3: Result ──────────────────────────────────────────── */}
            {addStep === 3 && (
              <View style={{ gap: 16 }}>
                <View
                  style={[
                    styles.resultInputWrap,
                    { backgroundColor: resultColors.bg + '60' },
                  ]}
                >
                  <TextInput
                    style={[styles.resultInput, { color: resultColors.text }]}
                    value={entryResultRaw}
                    onChangeText={setEntryResultRaw}
                    keyboardType="decimal-pad"
                    autoFocus
                    selectTextOnFocus
                    maxLength={5}
                  />
                </View>

                <View
                  style={[
                    styles.resultLabel,
                    { backgroundColor: resultColors.bg, borderColor: resultColors.border },
                  ]}
                >
                  <Text
                    style={[styles.resultLabelText, { color: resultColors.text }]}
                  >
                    {resultLabel}
                  </Text>
                </View>

                {resultStatus === 'fail' && (
                  <View style={styles.failWarningCard}>
                    <Ban
                      size={20}
                      color={BL_RESULT_COLORS.fail.text}
                      strokeWidth={1.5}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.failWarningTitle,
                          { color: BL_RESULT_COLORS.fail.text },
                        ]}
                      >
                        პირი ვერ დაიშვება სამუშაოდ
                      </Text>
                      <Text style={styles.failWarningSub}>
                        განმეორებითი ტესტი 15 წუთში
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ── Step 4: Signature ───────────────────────────────────────── */}
            {addStep === 4 && (
              <View style={{ gap: 16 }}>
                <Text style={styles.sigPrompt}>
                  {entryName}-მა ხელი მოაწეროს ტესტის შედეგს
                </Text>

                <Pressable
                  onPress={() => {
                    setSigTarget('entry');
                    setShowSigCanvas(true);
                  }}
                  style={[
                    styles.sigPlaceholder,
                    entrySignature
                      ? { borderColor: theme.colors.accent }
                      : {},
                  ]}
                  {...a11y('ხელმოწერა', 'ხელმოწერის დამატება', 'button')}
                >
                  {entrySignature ? (
                    <View style={styles.sigDone}>
                      <CircleCheck
                        size={28}
                        color={theme.colors.accent}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={{
                          color: theme.colors.accent,
                          fontWeight: '600',
                          marginTop: 4,
                        }}
                      >
                        ხელმოწერა შენახულია
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sigDone}>
                      <Pencil
                        size={28}
                        color={theme.colors.inkSoft}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={{
                          color: theme.colors.inkSoft,
                          marginTop: 4,
                          fontSize: 13,
                        }}
                      >
                        შეეხეთ ხელმოსაწერად
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Refuse signature */}
                <Pressable
                  onPress={() => {
                    setEntryRefusedSig(r => !r);
                    if (!entryRefusedSig) setEntrySignature(null);
                  }}
                  style={styles.refuseRow}
                  {...a11y('ხელმოწერაზე უარი', undefined, 'checkbox')}
                >
                  <View
                    style={[
                      styles.checkbox,
                      entryRefusedSig && {
                        backgroundColor: theme.colors.danger,
                        borderColor: theme.colors.danger,
                      },
                    ]}
                  >
                    {entryRefusedSig && (
                      <X size={14} color="#fff" strokeWidth={1.5} />
                    )}
                  </View>
                  <Text style={styles.refuseText}>
                    ხელმოწერაზე უარი
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.modalFooter,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            {addStep < 4 ? (
              <Button
                title="შემდეგი →"
                size="lg"
                onPress={() => setAddStep(s => s + 1)}
                disabled={
                  (addStep === 1 &&
                    (!entryName.trim() || !entryPosition.trim())) ||
                  (addStep === 3 && parseResult(entryResultRaw) < 0)
                }
              />
            ) : (
              <Button
                title="შენახვა"
                size="lg"
                onPress={saveEntry}
                loading={savingEntry}
                disabled={!canSaveEntry}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════
          Close Shift Modal
          ═════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showCloseShift}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCloseShift(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setShowCloseShift(false)}
              hitSlop={12}
              style={styles.modalBackBtn}
              {...a11y('გაუქმება', undefined, 'button')}
            >
              <X size={22} color={theme.colors.ink} strokeWidth={1.5} />
            </Pressable>
            <Text style={styles.modalTitle}>ცვლის დასრულება</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          >
            {/* Summary */}
            {log && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>
                  სულ ტესტირებულია: {log.entries.length} პირი
                </Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryChip}>
                    <Text
                      style={[
                        styles.summaryChipNum,
                        { color: BL_RESULT_COLORS.safe.text },
                      ]}
                    >
                      {counts.safe}
                    </Text>
                    <Text style={styles.summaryChipLabel}>SAFE</Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <Text
                      style={[
                        styles.summaryChipNum,
                        { color: BL_RESULT_COLORS.warning.text },
                      ]}
                    >
                      {counts.warning}
                    </Text>
                    <Text style={styles.summaryChipLabel}>WARNING</Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <Text
                      style={[
                        styles.summaryChipNum,
                        { color: BL_RESULT_COLORS.fail.text },
                      ]}
                    >
                      {counts.fail}
                    </Text>
                    <Text style={styles.summaryChipLabel}>FAIL</Text>
                  </View>
                </View>
              </View>
            )}

            <FloatingLabelInput
              label="პასუხისმგებელი პირი"
              required
              value={respName}
              onChangeText={setRespName}
            />

            <Pressable
              onPress={() => {
                setSigTarget('responsible');
                setShowSigCanvas(true);
              }}
              style={[
                styles.sigPlaceholder,
                respSig ? { borderColor: theme.colors.accent } : {},
              ]}
              {...a11y('ხელმოწერა', 'ხელმოწერის დამატება', 'button')}
            >
              {respSig ? (
                <View style={styles.sigDone}>
                  <CircleCheck
                    size={28}
                    color={theme.colors.accent}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontWeight: '600',
                      marginTop: 4,
                    }}
                  >
                    ხელმოწერა შენახულია
                  </Text>
                </View>
              ) : (
                <View style={styles.sigDone}>
                  <Pencil
                    size={28}
                    color={theme.colors.inkSoft}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{
                      color: theme.colors.inkSoft,
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  >
                    შეეხეთ ხელმოსაწერად
                  </Text>
                </View>
              )}
            </Pressable>
          </ScrollView>

          <View
            style={[
              styles.modalFooter,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <Button
              title="დასრულება და PDF გენერაცია"
              size="lg"
              onPress={closeShift}
              loading={closingShift}
              disabled={!respName.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════
          Signature Canvas (shared)
          ═════════════════════════════════════════════════════════════════════ */}
      <SignatureCanvas
        visible={showSigCanvas}
        personName={sigTarget === 'entry' ? entryName : respName}
        onCancel={() => setShowSigCanvas(false)}
        onConfirm={b64 => {
          setShowSigCanvas(false);
          if (sigTarget === 'entry') {
            setEntrySignature(b64);
            setEntryRefusedSig(false);
          } else {
            setRespSig(b64);
          }
        }}
      />
    </View>
  );
}

// ── Entry Row ─────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  index,
  theme,
  styles,
}: {
  entry: BLEntry;
  index: number;
  theme: any;
  styles: ReturnType<typeof getStyles>;
}) {
  const colors = BL_RESULT_COLORS[entry.resultStatus];
  const label =
    entry.resultStatus === 'safe'
      ? `SAFE · ${entry.result.toFixed(2)}`
      : entry.resultStatus === 'warning'
        ? `⚠ ${entry.result.toFixed(2)}`
        : `✗ FAIL · ${entry.result.toFixed(2)}`;

  return (
    <View
      style={[
        styles.entryRow,
        entry.testType === 'repeat' && { marginLeft: 16 },
      ]}
    >
      {/* # */}
      <Text style={styles.entryIndex}>{index + 1}</Text>

      {/* Name + position */}
      <View style={{ flex: 1 }}>
        {entry.testType === 'repeat' && (
          <Text style={styles.repeatLabelSmall}>↩ განმეორებითი</Text>
        )}
        <Text style={styles.entryName}>{entry.personName}</Text>
        <Text style={styles.entryPos}>
          {entry.position} · {timeDisplay(entry.time)}
        </Text>
      </View>

      {/* Result badge */}
      <View
        style={[
          styles.resultBadge,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.resultBadgeText, { color: colors.text }]}>
          {label}
        </Text>
      </View>

      {/* Sig indicator */}
      {entry.refusedSignature ? (
        <CircleX
          size={18}
          color={theme.colors.danger}
          strokeWidth={1.5}
        />
      ) : entry.signature ? (
        <CircleCheck
          size={18}
          color={theme.colors.accent}
          strokeWidth={1.5}
        />
      ) : (
        <Circle
          size={18}
          color={theme.colors.inkFaint}
          strokeWidth={1.5}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getStyles(theme: any) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    startBtn: {
      marginTop: 8,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
    },
    startBtnText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 15,
    },

    closedBadge: {
      backgroundColor: theme.colors.semantic.successSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      marginRight: 4,
    },
    closedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.semantic.success,
    },

    infoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    infoDate: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    snRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    snInput: {
      fontSize: 13,
      color: theme.colors.ink,
      minWidth: 80,
      maxWidth: 140,
    },

    listContent: {
      padding: 16,
      gap: 8,
    },
    emptyEntries: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyEntriesText: {
      fontSize: 14,
      color: theme.colors.inkFaint,
      fontWeight: '500',
    },

    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    },
    entryIndex: {
      width: 22,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkFaint,
    },
    entryName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    entryPos: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 1,
    },
    repeatLabelSmall: {
      fontSize: 10,
      color: theme.colors.accent,
      fontWeight: '600',
      marginBottom: 1,
    },
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },
    resultBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    repeatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: BL_RESULT_COLORS.fail.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BL_RESULT_COLORS.fail.border,
      marginTop: 4,
    },
    repeatCardTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    repeatCardSub: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    repeatCardBtn: {
      backgroundColor: BL_RESULT_COLORS.fail.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    repeatCardBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },

    bottomBar: {
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
    closeShiftBtn: {
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      alignItems: 'center',
    },
    closeShiftBtnText: {
      color: theme.colors.accent,
      fontWeight: '700',
      fontSize: 14,
    },
    addEntryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
    },
    addEntryBtnText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 15,
    },

    // Modal
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
    },
    modalBackBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    modalFooter: {
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
    },
    stepDots: {
      flexDirection: 'row',
      gap: 4,
      width: 36,
      justifyContent: 'flex-end',
    },
    stepDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.hairline,
    },
    stepDotActive: {
      backgroundColor: theme.colors.accent,
    },

    // Step 1 - person
    searchInput: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.ink,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    suggestionList: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.hairline,
    },
    suggestionAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionInitials: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    suggestionName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    suggestionPos: {
      fontSize: 12,
      color: theme.colors.inkSoft,
    },
    suggestionDate: {
      fontSize: 11,
      color: theme.colors.inkFaint,
    },

    // Step 2 - test type
    repeatLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: 10,
    },
    repeatLabelText: {
      fontSize: 14,
      fontWeight: '600',
    },
    typeChips: {
      flexDirection: 'row',
      gap: 10,
    },
    typeChip: {
      flex: 1,
      paddingVertical: 18,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    typeChipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    typeChipText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    typeChipTextActive: {
      color: theme.colors.accent,
    },

    // Step 3 - result
    resultInputWrap: {
      borderRadius: 20,
      paddingVertical: 32,
      alignItems: 'center',
    },
    resultInput: {
      fontSize: 52,
      fontWeight: '800',
      textAlign: 'center',
      minWidth: 150,
    },
    resultLabel: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    resultLabelText: {
      fontSize: 14,
      fontWeight: '700',
    },
    failWarningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      backgroundColor: BL_RESULT_COLORS.fail.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BL_RESULT_COLORS.fail.border,
    },
    failWarningTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    failWarningSub: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },

    // Step 4 - signature
    sigPrompt: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    sigPlaceholder: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderStyle: 'dashed',
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sigDone: {
      alignItems: 'center',
    },
    refuseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refuseText: {
      fontSize: 14,
      color: theme.colors.ink,
    },

    // Close shift
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryChip: {
      flex: 1,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
    },
    summaryChipNum: {
      fontSize: 24,
      fontWeight: '800',
    },
    summaryChipLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
  });
}
