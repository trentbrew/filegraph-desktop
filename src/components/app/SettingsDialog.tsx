import * as React from "react";
import {
  Eye,
  EyeOff,
  Layout,
  Palette,
  Info,
  Settings as SettingsIcon,
  Sliders,
  Grid3x3,
  FileText,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useUIStore } from "@/stores";
import type { LayoutMode } from "./navigation";

const settingsSections = [
  { id: "appearance", name: "Appearance", icon: Palette },
  { id: "explorer", name: "File Explorer", icon: FileText },
  { id: "layout", name: "Layout & Views", icon: Layout },
  { id: "advanced", name: "Advanced", icon: Sliders },
  { id: "about", name: "About", icon: Info },
];

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("appearance");
  const { theme, setTheme } = useTheme();
  
  const {
    layoutMode,
    previewEnabled,
    showDotfiles,
    setLayoutMode,
    setPreviewEnabled,
    setShowDotfiles,
  } = useUIStore();

  const renderContent = () => {
    switch (activeSection) {
      case "appearance":
        return <AppearanceSettings theme={theme} setTheme={setTheme} />;
      case "explorer":
        return (
          <ExplorerSettings
            showDotfiles={showDotfiles}
            setShowDotfiles={setShowDotfiles}
          />
        );
      case "layout":
        return (
          <LayoutSettings
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            previewEnabled={previewEnabled}
            setPreviewEnabled={setPreviewEnabled}
          />
        );
      case "advanced":
        return <AdvancedSettings />;
      case "about":
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" aria-label="Open Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[700px] lg:max-w-[900px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your application settings
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsSections.map((section) => (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={section.id === activeSection}
                          onClick={() => setActiveSection(section.id)}
                        >
                          <button type="button">
                            <section.icon />
                            <span>{section.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[580px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b">
              <div className="flex items-center gap-2 px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {settingsSections.find((s) => s.id === activeSection)?.name}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
              {renderContent()}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}

// Appearance Settings Section
function AppearanceSettings({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Color Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {["light", "dark", "system"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary ${
                theme === t ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div
                className={`h-16 w-full rounded ${
                  t === "light"
                    ? "bg-white border"
                    : t === "dark"
                    ? "bg-zinc-900"
                    : "bg-gradient-to-br from-white via-zinc-400 to-zinc-900"
                }`}
              />
              <span className="text-sm font-medium capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Interface Density</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing for more content
              </p>
            </div>
            <Switch id="compact-mode" disabled />
          </div>
        </div>
      </div>
    </div>
  );
}

// File Explorer Settings Section
function ExplorerSettings({
  showDotfiles,
  setShowDotfiles,
}: {
  showDotfiles: boolean;
  setShowDotfiles: (show: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Visibility</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showDotfiles ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="show-dotfiles">Show Hidden Files</Label>
                <p className="text-sm text-muted-foreground">
                  Display files and folders starting with "."
                </p>
              </div>
            </div>
            <Switch
              id="show-dotfiles"
              checked={showDotfiles}
              onCheckedChange={setShowDotfiles}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Behavior</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirm-delete">Confirm Before Delete</Label>
              <p className="text-sm text-muted-foreground">
                Show confirmation dialog when deleting files
              </p>
            </div>
            <Switch id="confirm-delete" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh when files change
              </p>
            </div>
            <Switch id="auto-refresh" defaultChecked disabled />
          </div>
        </div>
      </div>
    </div>
  );
}

// Layout Settings Section
function LayoutSettings({
  layoutMode,
  setLayoutMode,
  previewEnabled,
  setPreviewEnabled,
}: {
  layoutMode: LayoutMode;
  previewEnabled: boolean;
  setLayoutMode: (mode: LayoutMode) => void;
  setPreviewEnabled: (enabled: boolean) => void;
}) {
  const viewModes: { value: LayoutMode; label: string; description: string }[] = [
    { value: "table", label: "Table", description: "Classic table view with columns" },
    { value: "grid", label: "Grid", description: "Icon grid with thumbnails" },
    { value: "columns", label: "Columns", description: "Multi-column layout" },
    { value: "tree", label: "Tree", description: "Hierarchical tree view" },
    { value: "canvas", label: "Canvas", description: "Visual graph layout" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Default View Mode</h3>
        <div className="grid gap-3">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setLayoutMode(mode.value)}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary ${
                layoutMode === mode.value
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Grid3x3 className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{mode.label}</div>
                <div className="text-sm text-muted-foreground">
                  {mode.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Preview Panel</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preview-enabled">Enable Preview</Label>
              <p className="text-sm text-muted-foreground">
                Show file preview in side panel
              </p>
            </div>
            <Switch
              id="preview-enabled"
              checked={previewEnabled}
              onCheckedChange={setPreviewEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Advanced Settings Section
function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hardware-accel">Hardware Acceleration</Label>
              <p className="text-sm text-muted-foreground">
                Use GPU for rendering (requires restart)
              </p>
            </div>
            <Switch id="hardware-accel" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="file-watcher">File System Watcher</Label>
              <p className="text-sm text-muted-foreground">
                Monitor file changes in real-time
              </p>
            </div>
            <Switch id="file-watcher" defaultChecked disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Developer</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dev-tools">Enable DevTools</Label>
              <p className="text-sm text-muted-foreground">
                Access browser developer tools
              </p>
            </div>
            <Switch id="dev-tools" disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Data</h3>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            Clear Cache
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Reset All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// About Section
function AboutSection() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold mb-2">FileGraph</h3>
        <p className="text-sm text-muted-foreground mb-4">Version 0.1.0</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Built with</h4>
          <p className="text-sm text-muted-foreground">
            React, TypeScript, Tauri, TanStack Table, Zustand, shadcn/ui
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Report an Issue
            </a>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              View License
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
