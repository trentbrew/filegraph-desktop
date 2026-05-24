import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

export function Whiteboard() {
  return (
    <div className="h-full w-full">
      <Excalidraw />
    </div>
  )
}
