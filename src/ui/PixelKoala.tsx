import { StyleSheet, View, type ViewStyle } from 'react-native';

type PixelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

type PixelKoalaProps = {
  size?: number;
  style?: ViewStyle;
};

const RECTANGLES: PixelRect[] = [
  { x: 1, y: 2, w: 4, h: 4, color: '#9E9E9E' },
  { x: 2, y: 3, w: 2, h: 2, color: '#E0E0E0' },
  { x: 11, y: 2, w: 4, h: 4, color: '#9E9E9E' },
  { x: 12, y: 3, w: 2, h: 2, color: '#E0E0E0' },
  { x: 3, y: 3, w: 10, h: 8, color: '#BDBDBD' },
  { x: 3, y: 5, w: 10, h: 1, color: '#212121' },
  { x: 4, y: 5, w: 3, h: 3, color: '#212121' },
  { x: 9, y: 5, w: 3, h: 3, color: '#212121' },
  { x: 5, y: 6, w: 1, h: 1, color: '#FFFFFF' },
  { x: 10, y: 6, w: 1, h: 1, color: '#FFFFFF' },
  { x: 7, y: 7, w: 2, h: 3, color: '#424242' },
  { x: 4, y: 11, w: 8, h: 5, color: '#FFFFFF' },
  { x: 7, y: 11, w: 2, h: 5, color: '#E0E0E0' },
  { x: 3, y: 11, w: 2, h: 3, color: '#FFFFFF' },
  { x: 11, y: 11, w: 2, h: 3, color: '#FFFFFF' },
  { x: 3, y: 13, w: 2, h: 1, color: '#9E9E9E' },
  { x: 11, y: 13, w: 2, h: 1, color: '#9E9E9E' },
];

export function PixelKoala({ size = 96, style }: PixelKoalaProps) {
  const unit = Math.max(2, Math.floor(size / 16));
  const canvas = unit * 16;

  return (
    <View style={[styles.canvas, { width: canvas, height: canvas }, style]}>
      {RECTANGLES.map((rect, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: rect.x * unit,
            top: rect.y * unit,
            width: rect.w * unit,
            height: rect.h * unit,
            backgroundColor: rect.color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: 'transparent',
  },
});
