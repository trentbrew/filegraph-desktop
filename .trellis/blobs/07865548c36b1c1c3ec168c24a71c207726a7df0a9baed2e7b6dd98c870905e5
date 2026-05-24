import * as React from "react"
import { Plus, Save, Trash2, RotateCcw, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "@/components/themeProvider"
import { Theme, ThemeStyleProps } from "@/lib/themes/schema"
import { defaultTheme } from "@/lib/themes/registry"
import { v4 as uuidv4 } from "uuid"
import { formatHex, parse } from "culori"

// Group properties for better UX
const colorGroups = {
  base: [
    "background", "foreground",
    "card", "cardForeground",
    "popover", "popoverForeground",
    "border", "input", "ring"
  ],
  primary: ["primary", "primaryForeground"],
  secondary: ["secondary", "secondaryForeground"],
  muted: ["muted", "mutedForeground"],
  accent: ["accent", "accentForeground"],
  destructive: ["destructive", "destructiveForeground"],
  charts: ["chart1", "chart2", "chart3", "chart4", "chart5"],
  sidebar: [
    "sidebar", "sidebarForeground",
    "sidebarPrimary", "sidebarPrimaryForeground",
    "sidebarAccent", "sidebarAccentForeground",
    "sidebarBorder", "sidebarRing"
  ]
}

export function ThemeEditor() {
  const {
    themeId,
    setThemeId,
    availableThemes,
    addTheme,
    removeTheme,
    mode
  } = useTheme()

  const currentTheme = availableThemes.find(t => t.id === themeId) || defaultTheme
  const isCustom = currentTheme.type === "custom"

  // Local state for editing to avoid committing every keystroke to localStorage
  const [editingTheme, setEditingTheme] = React.useState<Theme | null>(null)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Sync editing state when theme changes
  React.useEffect(() => {
    setEditingTheme(JSON.parse(JSON.stringify(currentTheme)))
    setHasChanges(false)
  }, [themeId, availableThemes])

  const handleColorChange = (key: keyof ThemeStyleProps, value: string) => {
    if (!editingTheme) return

    const activeMode = mode === "system" ? "light" : mode // Default to light for system if needed, or handle better
    // Actually we should probably edit both modes or have a toggle in the editor.
    // For now, let's edit the CURRENT active mode's styles.

    // Better approach: Show tabs for Light/Dark in the editor
    // But to keep it simple, let's just update the specific path

    // We need to know which mode we are editing. Let's add a mode selector in the editor or just follow the app mode.
    // Let's follow the app mode for preview, but maybe allow switching?
    // Actually, the user might want to edit Dark mode while in Light mode.
    // Let's stick to editing the *active* mode for immediate feedback.

    const targetMode = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode

    const newStyles = { ...editingTheme.styles }
    newStyles[targetMode] = {
      ...newStyles[targetMode],
      [key]: value
    }

    setEditingTheme({
      ...editingTheme,
      styles: newStyles
    })
    setHasChanges(true)

    // Live preview: We need to apply this to the root temporarily?
    // The ThemeProvider applies styles based on the theme object in its state.
    // If we want live preview of *unsaved* changes, we might need to manually inject styles
    // or update the ThemeProvider to accept an "override" theme.
    // For now, let's just apply to document.documentElement.style directly for preview

    const toCssVar = (k: string) => {
      if (/^chart\d+$/.test(k)) return `--${k.replace("chart", "chart-")}`
      return `--${k.replace(/([A-Z])/g, "-$1").toLowerCase()}`
    }
    document.documentElement.style.setProperty(toCssVar(String(key)), value)
  }

  const handleSave = () => {
    if (!editingTheme) return

    if (isCustom) {
      // Update existing custom theme
      // We need a way to update a theme in the provider.
      // Currently we only have add/remove.
      // Let's remove and re-add (hacky but works for now)
      removeTheme(editingTheme.id)
      addTheme(editingTheme)
    } else {
      // Create new custom theme from builtin
      const newTheme: Theme = {
        ...editingTheme,
        id: uuidv4(),
        name: `${editingTheme.name} (Copy)`,
        type: "custom"
      }
      addTheme(newTheme)
      setThemeId(newTheme.id)
    }
    setHasChanges(false)
  }

  const handleCreateNew = () => {
    const newTheme: Theme = {
      ...defaultTheme,
      id: uuidv4(),
      name: "New Theme",
      type: "custom"
    }
    addTheme(newTheme)
    setThemeId(newTheme.id)
  }

  const handleDelete = () => {
    if (isCustom && confirm("Are you sure you want to delete this theme?")) {
      removeTheme(currentTheme.id)
    }
  }

  if (!editingTheme) return null

  const activeMode = mode === "system"
    ? (typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Theme Editor</h2>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel of the application.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isCustom && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!hasChanges}>
              <Copy className="w-4 h-4 mr-2" />
              Save as Copy
            </Button>
          )}
          {isCustom && (
            <>
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={handleCreateNew} title="Create New">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="theme-name" className="text-right">
            Name
          </Label>
          <Input
            id="theme-name"
            value={editingTheme.name}
            onChange={(e) => {
              setEditingTheme({ ...editingTheme, name: e.target.value })
              setHasChanges(true)
            }}
            className="col-span-3"
            disabled={!isCustom}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 h-[400px] pr-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
            <h3 className="font-medium">
              Editing <span className="capitalize text-primary">{activeMode}</span> Colors
            </h3>
            <span className="text-xs text-muted-foreground">
              Switch mode in app bar to edit other side
            </span>
          </div>

          {Object.entries(colorGroups).map(([group, keys]) => (
            <div key={group} className="space-y-3">
              <h4 className="text-sm font-medium capitalize text-muted-foreground">
                {group}
              </h4>
              <div className="grid gap-3">
                {keys.map((key) => (
                  <ColorInput
                    key={key}
                    label={key}
                    value={editingTheme.styles[activeMode][key as keyof ThemeStyleProps]}
                    onChange={(val) => handleColorChange(key as keyof ThemeStyleProps, val)}
                    disabled={!isCustom && !hasChanges} // Allow editing if we've started changes (which implies we'll save as copy)
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ColorInput({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  const hexValue = React.useMemo(() => {
    try {
      if (!value) return "#000000"
      const parsed = parse(value)
      return parsed ? formatHex(parsed) : "#000000"
    } catch {
      return "#000000"
    }
  }, [value])

  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <Label className="text-xs font-mono text-muted-foreground truncate" title={label}>
        {label}
      </Label>
      <div className="col-span-2 flex gap-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-10 rounded border bg-background p-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 font-mono text-xs"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
