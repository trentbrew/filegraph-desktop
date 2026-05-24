import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tab } from './Tab'

interface SortableTabProps {
  id: string
  title: string
  path?: string
  icon?: string
  isActive: boolean
  closable?: boolean
  onSelect: () => void
  onClose: () => void
  onRename?: (newTitle: string) => void
  onIconChange?: (newIcon: string) => void
}

export function SortableTab({
  id,
  title,
  path,
  icon,
  isActive,
  closable = true,
  onSelect,
  onClose,
  onRename,
  onIconChange,
}: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Tab
        id={id}
        title={title}
        path={path}
        icon={icon}
        isActive={isActive}
        closable={closable}
        onSelect={onSelect}
        onClose={onClose}
        onRename={onRename}
        onIconChange={onIconChange}
        className={isDragging ? 'shadow-lg' : ''}
      />
    </div>
  )
}
