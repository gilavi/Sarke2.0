import Svg, { Path } from 'react-native-svg';

/**
 * Hubble brand mark — the official H-monogram (two rounded "blob" forms whose
 * negative space is the H + orbital wave). Canonical in-app logo; mirrors the
 * web `HubbleLogo` (web-app/src/pages/landing/shared.tsx) and the source vector
 * (Khelogo.svg). Recolor via `color`.
 *
 * @param size   square px size (viewBox is 250×250). Default 28.
 * @param color  fill color. Default graphite `#1A1A1A`; pass white on the orange badge.
 * @returns a react-native-svg element (no side effects).
 */
export function HubbleMark({ size = 28, color = '#1A1A1A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 250 250">
      <Path
        fill={color}
        d="M247.5442,81.6993c-1.3564,0-2.4558,1.0994-2.4558,2.4558,0,7.9693-1.1761,15.8193-3.4966,23.3344-7.7204,25.0928-27.3102,44.6825-52.4025,52.4025l-.0019.001c-7.5122,2.3196-15.365,3.4957-23.3425,3.4957H43.3007c-23.8759,0-43.3007,19.4291-43.3007,43.3107s19.4248,43.3007,43.3007,43.3007,43.3103-19.4248,43.3103-43.3007c0-21.1736,17.2213-38.3991,38.3891-38.3991s38.3891,17.2256,38.3891,38.3991c0,23.8759,19.4286,43.3007,43.3103,43.3007s43.3007-19.4248,43.3007-43.3007v-122.5442c0-1.3564-1.0994-2.4558-2.4558-2.4558Z"
      />
      <Path
        fill={color}
        d="M2.4558,168.3002c1.3564,0,2.4558-1.0994,2.4558-2.4558,0-7.9722,1.1761-15.8221,3.4966-23.3358,3.7624-12.2507,10.5791-23.5541,19.7126-32.688,9.1056-9.1052,20.3745-15.9094,32.5959-19.6814.0393-.0101.0767-.0206.1151-.0326,7.5122-2.3196,15.3593-3.4957,23.3233-3.4957h122.5442c23.8759,0,43.3007-19.4291,43.3007-43.3107S230.5752,0,206.6993,0s-43.3103,19.4243-43.3103,43.3002c0,21.1736-17.2213,38.3991-38.3891,38.3991s-38.3891-17.2256-38.3891-38.3991C86.6109,19.4243,67.1823,0,43.3007,0S0,19.4243,0,43.3002v122.5442c0,1.3564,1.0994,2.4558,2.4558,2.4558Z"
      />
    </Svg>
  );
}
