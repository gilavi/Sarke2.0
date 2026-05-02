import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardTypeOptions,
  Pressable,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

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
  // Extended props for password toggles and other native props
  rightIcon?: keyof typeof Ionicons.glyphMap;
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

const BRAND_GREEN = '#1D9E75';
const LABEL_GRAY = '#9CA3AF';
const FLOAT_GRAY = '#6B7280';
const FLOAT_TOP = 6;
const SINK_TOP = 16;
const FLOAT_SIZE = 11;
const SINK_SIZE = 15;

export const FloatingLabelInput = React.forwardRef<TextInput, FloatingLabelInputProps>(
  function FloatingLabelInput(props, ref) {
    const {
      label, value, onChangeText, required, error, helper,
      disabled, multiline, numberOfLines, keyboardType, secureTextEntry,
      onFocus, onBlur, returnKeyType, onSubmitEditing,
      rightIcon, onRightIconPress,
      autoCapitalize, autoCorrect, autoFocus, maxLength,
      onEndEditing, inputAccessoryViewID, textAlignVertical,
      editable, style,
    } = props;

    const { theme } = useTheme();
    const isDisabled = disabled || editable === false;

    // Initialize floated if a value already exists on mount
    const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
    const [isFocused, setIsFocused] = useState(false);

    const float = () => {
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    };

    const sink = () => {
      if (!value) {
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
    };

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
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      sink();
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
      ? BRAND_GREEN
      : value
      ? FLOAT_GRAY
      : LABEL_GRAY;

    const borderColor = error
      ? theme.colors.semantic.danger
      : isFocused
      ? BRAND_GREEN
      : theme.colors.border;

    const borderWidth = isFocused || !!error ? 1.5 : 1;
    const floated = isFocused || !!value;

    const containerStyle = [
      styles.container,
      {
        borderColor,
        borderWidth,
        borderRadius: 10,
        backgroundColor: isDisabled ? '#F9F9F9' : theme.colors.surface,
        minHeight: multiline ? 100 : 56,
        height: multiline ? undefined : 56,
        maxHeight: multiline ? 200 : undefined,
      },
    ];

    const inputStyle = [
      styles.input,
      {
        paddingTop: floated ? 28 : 16,
        paddingRight: rightIcon ? 44 : 14,
        color: isDisabled ? theme.colors.inkFaint : theme.colors.ink,
        fontFamily: theme.typography.fontFamily.body,
      },
      multiline && styles.inputMultiline,
    ];

    return (
      <View style={[styles.wrapper, style]}>
        <View style={containerStyle}>
          <Animated.Text
            style={[
              styles.label,
              { top: labelTop, fontSize: labelSize, color: labelColor },
            ]}
            numberOfLines={1}
          >
            {label}
            {required ? <Text style={styles.asterisk}> *</Text> : null}
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

          {rightIcon && (
            <Pressable
              onPress={onRightIconPress}
              hitSlop={8}
              style={styles.rightIcon}
            >
              <Ionicons
                name={rightIcon}
                size={18}
                color={theme.colors.inkSoft}
              />
            </Pressable>
          )}
        </View>

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
    marginBottom: 16,
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
    color: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingBottom: 8,
    margin: 0,
    padding: 0,
    paddingLeft: 14,
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
