// Bottom sheet for PhotoAnnotator. Owns no state — every control is driven by
// props. A segmented Crop / Markup control sits at the top; below it the
// mode-specific controls:
//   - crop   : an interaction hint + Reset (pinch-to-zoom / drag does the framing,
//              so there are no rect handles or aspect chips here).
//   - markup : the draw tools row, then a color-swatch + brush-size options row
//              (moved out of the old floating canvas pills into the sheet, so they
//              no longer occlude the photo and never risk baking into the capture).

import { Pressable, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import {
  ArrowRight,
  Circle,
  Hand,
  Move,
  Pencil,
  RefreshCw,
  Square,
  Type,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { COLORS, COLOR_TOOLS, SIZE_PRESETS, STROKE_TOOLS } from './schema';
import type { Tool } from './schema';
import { EDITOR } from './styles';

type EditMode = 'crop' | 'markup';

interface AnnotatorToolbarProps {
  styles: any;
  t: (key: string, opts?: Record<string, unknown>) => string;
  mode: EditMode;
  onMode: (m: EditMode) => void;
  /** Home-indicator safe-area inset, reserved below the sheet. */
  bottomInset: number;
  /** A crop commit is in flight — lock the segmented control. */
  busy: boolean;
  // crop
  onResetCrop: () => void;
  // markup
  tool: Tool;
  onTool: (tool: Tool) => void;
  color: string;
  onColor: (c: string) => void;
  width: number;
  onWidth: (w: number) => void;
}

const drawTools: { key: Tool; Icon: LucideIcon }[] = [
  { key: 'pen', Icon: Pencil },
  { key: 'arrow', Icon: ArrowRight },
  { key: 'circle', Icon: Circle },
  { key: 'rect', Icon: Square },
  { key: 'text', Icon: Type },
  { key: 'move', Icon: Move },
];

// Visual dot diameter per preset index — a clear thin/medium/thick read,
// decoupled from the (smaller) literal stroke px.
const DOT = [7, 11, 15];

export function AnnotatorToolbar(props: AnnotatorToolbarProps) {
  const { styles, t, mode } = props;

  return (
    <View style={[styles.sheet, { paddingBottom: 10 + props.bottomInset }]}>
      {/* Segmented Crop / Markup */}
      <View style={[styles.seg, props.busy && { opacity: 0.55 }]}>
        {(['crop', 'markup'] as EditMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              disabled={props.busy}
              onPress={() => {
                if (!active) {
                  props.onMode(m);
                  haptic.light();
                }
              }}
              style={[styles.segItem, active && styles.segItemActive]}
              {...a11y(t(m === 'crop' ? 'photoAnnotator.tabCrop' : 'photoAnnotator.tabMarkup'), undefined, 'button')}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                {t(m === 'crop' ? 'photoAnnotator.tabCrop' : 'photoAnnotator.tabMarkup')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'crop' ? (
        <View style={styles.cropRow}>
          <View style={styles.cropHint}>
            <Hand size={15} color={EDITOR.inkFaint} strokeWidth={1.7} />
            <Text style={styles.cropHintText} numberOfLines={1}>
              {t('photoAnnotator.cropHint')}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              props.onResetCrop();
              haptic.light();
            }}
            style={styles.resetPill}
            {...a11y(t('photoAnnotator.reset'), t('photoAnnotator.resetCropA11yHint'), 'button')}
          >
            <RefreshCw size={15} color={EDITOR.ink} strokeWidth={1.8} />
            <Text style={styles.resetText}>{t('photoAnnotator.reset')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Draw tools */}
          <View style={styles.toolsRow}>
            {drawTools.map(({ key, Icon }) => {
              const active = props.tool === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => props.onTool(key)}
                  style={[styles.toolBtn, active && styles.toolBtnActive]}
                  {...a11y(`${t('photoAnnotator.toolA11yPrefix')}${key}`, t('photoAnnotator.toolA11yHint'), 'button')}
                >
                  <Icon size={21} color={active ? EDITOR.onAccent : EDITOR.inkSoft} strokeWidth={1.7} />
                </Pressable>
              );
            })}
          </View>

          {/* Color swatches + brush sizes */}
          <View style={styles.optRow}>
            {COLOR_TOOLS.includes(props.tool) ? (
              <View style={styles.swatchGroup}>
                {COLORS.map((c) => {
                  const active = props.color === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => {
                        props.onColor(c.value);
                        haptic.light();
                      }}
                      hitSlop={6}
                      style={[
                        styles.swatch,
                        { backgroundColor: c.value },
                        c.value === '#FFFFFF' && styles.swatchLite,
                        active && styles.swatchActive,
                      ]}
                      {...a11y(`${t('photoAnnotator.colorA11yPrefix')}${c.label}`, t('photoAnnotator.colorA11yHint'), 'button')}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.optHint}>{t('photoAnnotator.moveHint')}</Text>
            )}

            {STROKE_TOOLS.includes(props.tool) && (
              <View style={styles.sizeGroup}>
                {SIZE_PRESETS.map((w, i) => {
                  const active = props.width === w;
                  const d = DOT[i];
                  return (
                    <Pressable
                      key={w}
                      onPress={() => {
                        props.onWidth(w);
                        haptic.light();
                      }}
                      hitSlop={6}
                      style={styles.sizeCell}
                      {...a11y(`${t('photoAnnotator.widthA11yPrefix')}${w}px`, t('photoAnnotator.widthA11yHint'), 'button')}
                    >
                      <View
                        style={{
                          width: d,
                          height: d,
                          borderRadius: d / 2,
                          backgroundColor: active ? EDITOR.accent : EDITOR.inkFaint,
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
