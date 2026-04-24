import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

export interface BottomSheetOptions {
  title?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
}

export type ShowBottomSheet = (
  options: BottomSheetOptions,
  callback: (index: number | undefined) => void,
) => void;

const Ctx = createContext<ShowBottomSheet | null>(null);

export function useBottomSheet(): ShowBottomSheet {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBottomSheet must be used inside BottomSheetProvider');
  return ctx;
}

interface SheetState {
  options: BottomSheetOptions;
}

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const callbackRef = useRef<((idx: number | undefined) => void) | null>(null);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((idx: number | undefined) => {
    const cb = callbackRef.current;
    callbackRef.current = null;
    setSheet(null);
    cb?.(idx);
  }, []);

  const show: ShowBottomSheet = useCallback((options, callback) => {
    callbackRef.current = callback;
    setSheet({ options });
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <Modal
        visible={!!sheet}
        transparent
        animationType="slide"
        onRequestClose={() => dismiss(sheet?.options.cancelButtonIndex)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => dismiss(sheet?.options.cancelButtonIndex)}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            {/* Inner Pressable stops backdrop tap from propagating through the sheet */}
            <Pressable>
              {sheet?.options.title ? (
                <Text style={styles.title}>{sheet.options.title}</Text>
              ) : (
                <View style={styles.handle} />
              )}
              {sheet?.options.options.map((opt, i) => {
                const isCancel = i === sheet.options.cancelButtonIndex;
                const isDestructive = i === sheet.options.destructiveButtonIndex;
                return (
                  <Pressable
                    key={i}
                    onPress={() => dismiss(i)}
                    style={({ pressed }) => [
                      styles.option,
                      isCancel && styles.cancelOption,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isCancel && styles.cancelText,
                        isDestructive && styles.destructiveText,
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  option: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    alignItems: 'center',
  },
  cancelOption: {
    marginTop: 8,
    marginHorizontal: 0,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    borderTopWidth: 0,
    paddingVertical: 16,
  },
  optionPressed: {
    opacity: 0.55,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.ink,
    fontWeight: '500',
  },
  cancelText: {
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
  destructiveText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
