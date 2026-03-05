import { Platform, type TextStyle } from 'react-native';

export const pixelFontFamily =
  Platform.select({
    web: 'PressStart2P, "Courier New", monospace',
    ios: 'PressStart2P',
    android: 'PressStart2P',
    default: 'PressStart2P',
  }) ?? 'Courier New';

export const bodyFontFamily =
  Platform.select({
    web: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }) ?? 'sans-serif';

export const pixelText: TextStyle = {
  fontFamily: pixelFontFamily,
  textTransform: 'uppercase',
  letterSpacing: 0.45,
  fontWeight: '400',
};

export const pixelHeading: TextStyle = {
  fontFamily: pixelFontFamily,
  textTransform: 'uppercase',
  letterSpacing: 0.45,
  fontWeight: '400',
};

export const pixelLabel: TextStyle = {
  fontFamily: pixelFontFamily,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  fontWeight: '400',
};

export const bodyText: TextStyle = {
  fontFamily: bodyFontFamily,
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: '500',
};
