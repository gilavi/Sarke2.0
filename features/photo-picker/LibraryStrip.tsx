// Bottom recent-photos strip for the /photo-picker flow: a horizontal FlatList
// of the ~50 most recent library photos (single-tap pick or ordered
// multi-select), plus the library-permission empty states. Purely
// presentational — selection state lives in app/photo-picker.tsx and is passed
// down; taps are reported up via onPickAsset / onToggleSelect.
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from 'react-i18next';
import { a11y } from '../../lib/accessibility';
import { useTheme } from '../../lib/theme';
import { styles } from './pickerStyles';

/** The permission response shape returned by MediaLibrary.usePermissions(). */
type LibPerm = ReturnType<typeof MediaLibrary.usePermissions>[0];

const MemoizedAssetItem = memo(function AssetItem({
  item,
  onPress,
  disabled,
  selectable,
  selectionIndex,
}: {
  item: MediaLibrary.Asset;
  onPress: (asset: MediaLibrary.Asset) => void;
  disabled: boolean;
  selectable: boolean;
  /** 1-based position in the selection, or 0 when not selected. */
  selectionIndex: number;
}) {
  const { t } = useTranslation();
  const selected = selectionIndex > 0;
  return (
    <Pressable
      onPress={() => void onPress(item)}
      style={styles.thumb}
      disabled={disabled}
      {...a11y(t('photoPicker.recentPhoto'), undefined, 'imagebutton', { selected, disabled })}
    >
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      {selectable && selected ? (
        <>
          <View style={styles.thumbSelectedOverlay} />
          <View style={styles.thumbCheck}>
            <Text style={styles.thumbCheckText}>{selectionIndex}</Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
});

type Props = {
  libPerm: LibPerm;
  assets: MediaLibrary.Asset[];
  multiMode: boolean;
  /** True while a pick is resolving — disables single-mode taps. */
  selecting: boolean;
  /** Ordered selection of asset ids (multi mode). */
  selectedIds: string[];
  /** Single-mode strip tap. */
  onPickAsset: (asset: MediaLibrary.Asset) => void;
  /** Multi-mode strip tap (toggle). */
  onToggleSelect: (asset: MediaLibrary.Asset) => void;
  /** Request library permission ("Grant access"). */
  onRequestLibPerm: () => void;
};

/** Recent-library thumbnail strip + its permission empty states. */
export function LibraryStrip({
  libPerm,
  assets,
  multiMode,
  selecting,
  selectedIds,
  onPickAsset,
  onToggleSelect,
  onRequestLibPerm,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const selectionIndexFor = useCallback(
    (id: string) => selectedIds.indexOf(id) + 1,
    [selectedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset }) => (
      <MemoizedAssetItem
        item={item}
        onPress={multiMode ? onToggleSelect : onPickAsset}
        disabled={multiMode ? false : selecting}
        selectable={multiMode}
        selectionIndex={multiMode ? selectionIndexFor(item.id) : 0}
      />
    ),
    [multiMode, onPickAsset, selecting, selectionIndexFor, onToggleSelect],
  );

  return (
    <View style={styles.libraryStrip}>
      {!libPerm?.granted ? (
        <View style={styles.libraryEmpty}>
          <Text style={styles.libraryEmptyText}>
            {t('photoPicker.libraryPermRequired')}
          </Text>
          {libPerm && !libPerm.canAskAgain ? (
            <Pressable onPress={() => void Linking.openSettings()} style={styles.permButton}>
              <Text style={styles.permButtonText}>{t('photoPicker.openSettings')}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => void onRequestLibPerm()} style={styles.permButton}>
              <Text style={styles.permButtonText}>{t('photoPicker.grantAccess')}</Text>
            </Pressable>
          )}
        </View>
      ) : assets.length === 0 ? (
        <View style={styles.libraryEmpty}>
          <ActivityIndicator color={theme.colors.inkSoft} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={assets}
          keyExtractor={a => a.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 12 }}
          renderItem={renderItem}
          extraData={selectedIds}
        />
      )}
    </View>
  );
}
