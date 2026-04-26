import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  error?: string;
  label?: string;
}

export function Input({ error, label, className = '', ...rest }: InputProps) {
  return (
    <View className="gap-1">
      {label ? <Text className="text-sm font-semibold text-ink-soft">{label}</Text> : null}
      <TextInput
        {...rest}
        className={`
          h-12 px-4 rounded-xl border bg-white text-ink text-base
          ${error ? 'border-red-500' : 'border-hairline'}
          ${className}
        `}
        placeholderTextColor="#8E8E93"
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
