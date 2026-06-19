import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardTypeOptions,
  Pressable,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';

export interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  error?: string;
  helper?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  blurOnSubmit?: boolean;
  // Extended props for password toggles and other native props
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  onEndEditing?: (() => void) | ((e: any) => void);
  inputAccessoryViewID?: string;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
  editable?: boolean;
  style?: any;
}

const FLOAT_TOP = 9;
const SINK_TOP = 16;
const FLOAT_SIZE = 11;
const SINK_SIZE = 15;

export const FloatingLabelInput = React.forwardRef<TextInput, FloatingLabelInputProps>(
  function FloatingLabelInput(props, ref) {
    const {
      label, value: valueProp, onChangeText, required, error, helper,
      disabled, multiline, numberOfLines, keyboardType, secureTextEntry,
      onFocus, onBlur, returnKeyType, onSubmitEditing,
      textContentType, autoComplete, blurOnSubmit,
      rightIcon: RightIcon, onRightIconPress,
      autoCapitalize, autoCorrect, autoFocus, maxLength,
      onEndEditing, inputAccessoryViewID, textAlignVertical,
      editable, style,
    } = props;
    const value = valueProp ?? '';

    const { theme } = useTheme();
    const { reduceMotion } = useAccessibilitySettings();
    const isDisabled = disabled || editable === false;

    // Initialize floated if a value already exists on mount
    const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
    // Focus border-color tween: 0 = rest, 1 = focused. Legacy Animated to match
    // the label float (this file deliberately has no reanimated).
    const borderAnim = useRef(new Animated.Value(0)).current;
    const [isFocused, setIsFocused] = useState(false);

    const float = () => {
      if (reduceMotion) { floatAnim.setValue(1); return; }
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    };

    const sink = () => {
      if (!value) {
        if (reduceMotion) { floatAnim.setValue(0); return; }
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
    };

    useEffect(() => () => {
      floatAnim.stopAnimation();
      borderAnim.stopAnimation();
    }, []);

    // Keep label floated when value is set externally (e.g. pre-filled edit form)
    const prevValue = useRef(value);
    if (prevValue.current !== value) {
      prevValue.current = value;
      if (!isFocused) {
        floatAnim.setValue(value ? 1 : 0);
      }
    }

    const handleFocus = () => {
      setIsFocused(true);
      float();
      if (reduceMotion) borderAnim.setValue(1);
      else Animated.timing(borderAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      sink();
      if (reduceMotion) borderAnim.setValue(0);
      else Animated.timing(borderAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      onBlur?.();
    };

    const labelTop = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SINK_TOP, FLOAT_TOP],
    });

    const labelSize = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SINK_SIZE, FLOAT_SIZE],
    });

    // State-based color: changes instantly with focus/error/value state
    const labelColor = error
      ? theme.colors.semantic.danger
      : isFocused
      ? theme.colors.inkSoft
      : value
      ? theme.colors.inkSoft
      : theme.colors.inkFaint;

    // Border color animates between rest (border) and focused (ink) over 150ms;
    // error wins instantly. borderWidth stays state-driven (instant) to avoid
    // sub-pixel reflow mid-tween.
    const borderColor = error
      ? theme.colors.semantic.danger
      : borderAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.border, theme.colors.ink],
        });

    const borderWidth = isFocused || !!error ? 1.5 : 1;
    const floated = isFocused || !!value;

    const containerStyle = [
      styles.container,
      {
        borderColor,
        borderWidth,
        borderRadius: 10,
        backgroundColor: isDisabled ? theme.colors.surfaceSecondary : theme.colors.surface,
        minHeight: multiline ? 100 : 56,
        height: multiline ? undefined : 56,
        maxHeight: multiline ? 200 : undefined,
      },
    ];

    const inputStyle = [
      styles.input,
      {
        paddingTop: floated ? 24 : 16,
        paddingRight: RightIcon ? 44 : 14,
        color: isDisabled ? theme.colors.inkFaint : theme.colors.ink,
        fontFamily: theme.typography.fontFamily.body,
      },
      multiline && styles.inputMultiline,
    ];

    return (
      <View style={[styles.wrapper, style]}>
        <Animated.View style={containerStyle}>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.label,
              { top: labelTop, fontSize: labelSize, color: labelColor },
            ]}
            numberOfLines={1}
          >
            {label}
            {required ? <Text style={[styles.asterisk, { color: theme.colors.danger }]}> *</Text> : null}
          </Animated.Text>

          <TextInput
            ref={ref}
            style={inputStyle}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!isDisabled}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={blurOnSubmit}
            textContentType={textContentType}
            autoComplete={autoComplete}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            autoFocus={autoFocus}
            maxLength={maxLength}
            onEndEditing={onEndEditing as any}
            inputAccessoryViewID={inputAccessoryViewID}
            textAlignVertical={multiline ? (textAlignVertical ?? 'top') : undefined}
            placeholderTextColor={theme.colors.inkFaint}
            scrollEnabled={multiline}
          />

          {RightIcon && (
            <Pressable
              onPress={onRightIconPress}
              hitSlop={8}
              style={styles.rightIcon}
            >
              <RightIcon
                size={18}
                color={theme.colors.inkSoft}
                strokeWidth={1.5}
              />
            </Pressable>
          )}
        </Animated.View>

        {error ? (
          <Text style={[styles.subText, { color: theme.colors.semantic.danger }]}>
            {error}
          </Text>
        ) : helper ? (
          <Text style={[styles.subText, { color: theme.colors.inkFaint }]}>
            {helper}
          </Text>
        ) : null}
      </View>
    );
  },
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    backgroundColor: 'transparent',
    fontFamily: 'Inter-Regular',
  },
  asterisk: {
    // danger color applied inline via theme in render
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingBottom: 8,
    margin: 0,
    padding: 0,
    paddingLeft: 14,
    // Prevent Android from painting its own white background over the themed
    // container surface - without this, light text is invisible in dark mode.
    backgroundColor: 'transparent',
  },
  inputMultiline: {
    paddingBottom: 10,
    alignSelf: 'stretch',
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  subText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
});
