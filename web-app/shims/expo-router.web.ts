// Web stub for expo-router in the Storybook showcase.
//
// Components like HeaderBackButton/HeaderBackPill call useRouter() for back
// navigation. The showcase has no router, and expo-router ships JSX in .js files
// that rollup's CJS parser rejects at build time. The showcase never navigates,
// so we stub the surface components touch. Mirrors the metro WEB_SHIMS pattern.
import React from 'react';

const noop = () => {};

export function useRouter() {
  return {
    back: noop,
    canGoBack: () => false,
    push: noop,
    replace: noop,
    navigate: noop,
    dismiss: noop,
    dismissAll: noop,
    dismissTo: noop,
    setParams: noop,
    reload: noop,
  };
}

export const usePathname = () => '/';
export const useLocalSearchParams = () => ({});
export const useGlobalSearchParams = () => ({});
export const useSegments = () => [] as string[];
export const useFocusEffect = (_cb: unknown) => {};
export const useNavigation = () => ({ navigate: noop, goBack: noop, setOptions: noop });
export const router = {
  back: noop,
  canGoBack: () => false,
  push: noop,
  replace: noop,
  navigate: noop,
  setParams: noop,
};

export function Link({ children }: { children?: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
export function Redirect() {
  return null;
}
export const Stack: any = () => null;
export const Tabs: any = () => null;
export const Slot: any = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
