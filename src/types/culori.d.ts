declare module 'culori' {
  export interface Color {
    mode: string;
    [key: string]: any;
  }
  export function parse(color: string): Color | undefined;
  export function formatHex(color: string | Color): string;
}
