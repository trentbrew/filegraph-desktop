/**
 * Quick Notes Widget
 * Scratch pad for quick thoughts
 */

import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import type { QuickNotesWidgetData } from '@/lib/widgets'

interface QuickNotesWidgetProps {
  data: QuickNotesWidgetData
  onUpdate: (data: Partial<QuickNotesWidgetData>) => void
}

export function QuickNotesWidget({ data, onUpdate }: QuickNotesWidgetProps) {
  const { state } = data

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({
      state: {
        ...state,
        content: e.target.value,
      },
    })
  }

  return (
    <div className="p-3 h-full">
      <Textarea
        value={state.content}
        onChange={handleChange}
        placeholder="What's on your mind?"
        className="h-full min-h-[200px] resize-none text-sm font-mono border-0 !bg-transparent focus-visible:ring-0 p-0"
      />
    </div>
  )
}
