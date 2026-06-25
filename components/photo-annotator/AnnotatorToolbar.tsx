// Bottom toolbar for PhotoAnnotator. Owns no state — every control is driven by
// props. Two modes:
//  - draw : ONE row — a distinct Crop chip, then the horizontally-scrollable draw
//           tools — then the primary Save pill. The color + size controls are NOT
//           here anymore: they float over the canvas (AnnotatorColorBar /
//           AnnotatorSizeBar), so the footer never grows to two rows.
//  - crop : Cancel / Apply (aspect presets removed; rotate lives in the header).

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  ArrowRight,
  Circle,
  Crop,
  Move,
  Pencil,
  Square,
  Type,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { a11y } from '../../lib/accessibility';
import type { Tool } from './schema';
import { ON_ACCENT_INK } from './styles';

interface AnnotatorToolbarProps {
  styles: any;
  theme: any;
  t: (key: string, opts?: Record<string, unknown>) => string;
  cropMode: boolean;
  /** Home-indicator safe-area inset, reserved below the Save / Apply pills. */
  bottomInset: number;
  // draw mode
  tool: Tool;
  onTool: (tool: Tool) => void;
  onSave: () => void;
  saving: boolean;
  onCrop: () => void;
  // crop mode
  onCropApply: () => void;
  onCropCancel: () => void;
  busy: boolean;
}

const drawTools: { key: Tool; Icon: LucideIcon }[] = [
  { key: 'pen', Icon: Pencil },
  { key: 'arrow', Icon: ArrowRight },
  { key: 'circle', Icon: Circle },
  { key: 'rect', Icon: Square },
  { key: 'text', Icon: Type },
  { key: 'move', Icon: Move },
];

export function AnnotatorToolbar(props: AnnotatorToolbarProps) {
  const { styles, theme, t, cropMode } = props;
  const toolbarStyle = [styles.toolbar, { paddingBottom: 16 + props.bottomInset }];

  if (cropMode) {
    return (
      <View style={toolbarStyle}>
        <View style={styles.cropActions}>
          <Pressable onPress={props.onCropCancel} style={styles.cropCancelBtn} {...a11y(t('common.cancel'), undefined, 'button')}>
            <Text style={styles.cropCancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable onPress={props.onCropApply} disabled={props.busy} style={styles.cropApplyBtn} {...a11y(t('photoAnnotator.cropApply'), undefined, 'button')}>
            {props.busy ? (
              <ActivityIndicator color={ON_ACCENT_INK} />
            ) : (
              <Text style={styles.saveBtnText}>{t('photoAnnotator.cropApply')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={toolbarStyle}>
      <View style={styles.toolsRow}>
        <Pressable onPress={props.onCrop} style={styles.cropChip} {...a11y(t('photoAnnotator.cropA11y'), t('photoAnnotator.cropA11yHint'), 'button')}>
          <Crop size={22} color={theme.colors.inkSoft} strokeWidth={1.6} />
          <Text style={styles.cropChipLabel}>{t('photoAnnotator.cropA11y')}</Text>
        </Pressable>
        <View style={styles.divider} />
        {/* flex:1 is load-bearing: a horizontal ScrollView in a flex row needs a
            bounded width or it takes its full content width and the rightmost
            tools render off-screen / unreachable. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScrollView} contentContainerStyle={styles.toolScroll}>
          {drawTools.map(({ key, Icon }) => (
            <Pressable
              key={key}
              onPress={() => props.onTool(key)}
              style={[styles.toolBtn, props.tool === key && styles.toolBtnActive]}
              {...a11y(`${t('photoAnnotator.toolA11yPrefix')}${key}`, t('photoAnnotator.toolA11yHint'), 'button')}
            >
              <Icon size={22} color={props.tool === key ? ON_ACCENT_INK : theme.colors.inkSoft} strokeWidth={1.6} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable onPress={props.onSave} disabled={props.saving} style={styles.saveBtn} {...a11y(t('common.save'), t('photoAnnotator.saveA11yHint'), 'button')}>
        <Text style={styles.saveBtnText}>{props.saving ? t('photoAnnotator.saving') : t('common.save')}</Text>
      </Pressable>
    </View>
  );
}
