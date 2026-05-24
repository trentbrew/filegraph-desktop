import { z } from "zod"

export const themeStylePropsSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  card: z.string(),
  cardForeground: z.string(),
  popover: z.string(),
  popoverForeground: z.string(),
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  muted: z.string(),
  mutedForeground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  destructive: z.string(),
  destructiveForeground: z.string(),
  border: z.string(),
  input: z.string(),
  ring: z.string(),
  chart1: z.string(),
  chart2: z.string(),
  chart3: z.string(),
  chart4: z.string(),
  chart5: z.string(),
  sidebar: z.string(),
  sidebarForeground: z.string(),
  sidebarPrimary: z.string(),
  sidebarPrimaryForeground: z.string(),
  sidebarAccent: z.string(),
  sidebarAccentForeground: z.string(),
  sidebarBorder: z.string(),
  sidebarRing: z.string(),
})

export const themeStylesSchema = z.object({
  light: themeStylePropsSchema,
  dark: themeStylePropsSchema,
})

export type ThemeStyleProps = z.infer<typeof themeStylePropsSchema>
export type ThemeStyles = z.infer<typeof themeStylesSchema>

export const themeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["builtin", "custom"]),
  styles: themeStylesSchema,
})

export type Theme = z.infer<typeof themeSchema>
