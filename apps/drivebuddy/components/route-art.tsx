import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// Decorative road: a thick curved stroke with a dashed center line and a
// destination dot. Sits behind hero content; purely visual.

const ROAD = "M -20 170 C 70 170 110 92 188 96 S 300 40 372 8";

export function RouteArt({
  road,
  lane,
  dot,
  style,
}: {
  road: string;
  lane: string;
  dot: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      viewBox="0 0 340 180"
      preserveAspectRatio="xMaxYMid slice"
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
    >
      <Path d={ROAD} stroke={road} strokeWidth={26} strokeLinecap="round" fill="none" />
      <Path
        d={ROAD}
        stroke={lane}
        strokeWidth={2.5}
        strokeDasharray="10 12"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={188} cy={96} r={7} fill={dot} />
    </Svg>
  );
}
