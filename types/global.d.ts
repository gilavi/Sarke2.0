declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.lottie';
declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'signature_pad' {
  export default class SignaturePad {
    constructor(canvas: HTMLCanvasElement, options?: any);
    clear(): void;
    toDataURL(type?: string): string;
    fromData(data: any[]): void;
    toData(): any[];
    isEmpty(): boolean;
    onBegin?: () => void;
    onEnd?: () => void;
  }
}

declare module 'react-dom/client' {
  import { ReactElement } from 'react';
  export function createRoot(container: HTMLElement): {
    render(element: ReactElement): void;
    unmount(): void;
  };
}

declare module 'vite' {
  export function defineConfig(config: any): any;
}

declare module '@vitejs/plugin-react' {
  export default function react(options?: any): any;
}
