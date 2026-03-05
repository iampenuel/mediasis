import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { pixelFontFamily } from './typography';
import { theme } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cyan';
  size?: 'default' | 'compact';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Button({ label, onPress, disabled = false, variant = 'primary', size = 'default', style, textStyle }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';
  const isCyan = variant === 'cyan';
  const isCompact = size === 'compact';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isCompact && styles.buttonCompact,
        isPrimary && styles.primaryButton,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        isGhost && styles.ghostButton,
        isOutline && styles.outlineButton,
        isCyan && styles.cyanButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.buttonText,
          isCompact && styles.buttonTextCompact,
          isPrimary && styles.primaryButtonText,
          isSecondary && styles.secondaryButtonText,
          isDanger && styles.dangerButtonText,
          isGhost && styles.ghostButtonText,
          isOutline && styles.outlineButtonText,
          isCyan && styles.cyanButtonText,
          textStyle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 10,
    alignSelf: 'stretch',
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  buttonCompact: {
    minHeight: 46,
    marginTop: 8,
    paddingVertical: 9,
    shadowOffset: { width: 3, height: 3 },
  },
  primaryButton: {
    backgroundColor: theme.gold,
    borderColor: theme.gold,
    shadowColor: theme.orangeShadow,
  },
  secondaryButton: {
    borderColor: theme.border,
    backgroundColor: theme.panel,
    shadowColor: '#13253D',
  },
  dangerButton: {
    borderColor: theme.error,
    backgroundColor: theme.error,
    shadowColor: '#7B2F2F',
  },
  ghostButton: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  outlineButton: {
    borderColor: theme.border,
    backgroundColor: theme.panelDeep,
    shadowOpacity: 0,
  },
  cyanButton: {
    borderColor: theme.cyan,
    backgroundColor: theme.cyan,
    shadowColor: theme.orangeShadow,
  },
  buttonPressed: {
    transform: [{ translateX: 4 }, { translateY: 4 }],
    shadowOpacity: 0,
  },
  buttonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
  },
  buttonText: {
    fontFamily: pixelFontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 16,
    fontWeight: '400',
  },
  buttonTextCompact: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  primaryButtonText: {
    color: theme.accentText,
  },
  secondaryButtonText: {
    color: theme.text,
  },
  dangerButtonText: {
    color: '#FFF7F7',
  },
  ghostButtonText: {
    color: theme.muted,
    fontSize: 14,
  },
  outlineButtonText: {
    color: theme.text,
  },
  cyanButtonText: {
    color: theme.accentText,
  },
});
