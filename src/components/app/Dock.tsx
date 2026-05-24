import * as React from 'react'
import { Folder, Calendar, Mail, Globe, Settings, MessageCircle, Music, ImageIcon, Upload } from 'lucide-react'
import { ExpandableTabs, type TabItem } from '@/components/ui/expandable-tabs'
import { useAppStore, type AppId } from '@/stores/useAppStore'

// Map tab index to app ID
const APP_IDS: AppId[] = ['files', 'calendar', 'inbox', 'messages', 'browser', 'gallery', 'music']

const DOCK_TABS: TabItem[] = [
  { title: 'Files', icon: Folder },
  { title: 'Calendar', icon: Calendar },
  { title: 'Inbox', icon: Mail },
  { title: 'Messages', icon: MessageCircle },
  { title: 'Browser', icon: Globe },
  { title: 'Gallery', icon: ImageIcon },
  { title: 'Music', icon: Music },
  { type: 'separator' },
  { title: 'Import', icon: Upload },
  { title: 'Settings', icon: Settings },
]

export function Dock() {
  const { activeApp, setActiveApp } = useAppStore()

  // Find the current active index
  const activeIndex = React.useMemo(() => {
    const idx = APP_IDS.indexOf(activeApp)
    return idx >= 0 ? idx : null
  }, [activeApp])

  const handleChange = (index: number | null) => {
    if (index === null) return

    // Handle app tabs (indices 0-7)
    if (index < APP_IDS.length) {
      setActiveApp(APP_IDS[index])
      return
    }

    // Handle action tabs after separator
    // Index 7 is separator, 8 is Import, 9 is Settings
    if (index === 8) {
      // Import - open camera/import modal
      const { setCameraOpen } = require('@/stores/useUIStore').useUIStore.getState()
      setCameraOpen(true)
    } else if (index === 9) {
      // Settings
      const { openGlobalSettings } = require('@/lib/commands/modules/general')
      openGlobalSettings()
    }
  }

  return (
    <ExpandableTabs tabs={DOCK_TABS} activeIndex={activeIndex} onChange={handleChange} className="backdrop-blur-sm" />
  )
}
