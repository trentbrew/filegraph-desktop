declare module 'tauri-pty' {
  export interface Pty {
    write(data: string): void
    resize(cols: number, rows: number): void
    kill(): void
    onData(cb: (data: string) => void): void
  }

  export function spawn(
    program: string,
    args?: string[],
    options?: {
      cols?: number
      rows?: number
      cwd?: string
      env?: Record<string, string>
    },
  ): Promise<Pty>
}
