import { ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined';
  className?: string;
}

const variantClasses = {
  elevated: 'bg-white rounded-2xl shadow-sm',
  outlined: 'bg-white rounded-2xl border border-hairline',
};

export function Card({ children, variant = 'elevated', className = '' }: CardProps) {
  return (
    <View className={`p-4 ${variantClasses[variant]} ${className}`}>
      {children}
    </View>
  );
}
