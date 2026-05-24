/**
 * IconPicker Component
 *
 * Notion/Linear-style icon picker with search, categories, and recent icons
 */

import * as React from 'react'
import { Input } from '@/components/ui/input'
import {
  Search,
  Hash,
  Heart,
  Star,
  Bookmark,
  Calendar,
  Clock,
  Globe,
  Camera,
  Music,
  Gamepad2,
  Palette,
  Code,
  Database,
  Shield,
  Rocket,
  Trophy,
  Crown,
  Gem,
  Flame,
  Sun,
  Moon,
  Cloud,
  Mountain,
  Trees,
  Flower,
  Bug,
  Fish,
  Bird,
  Dog,
  Cat,
  Coffee,
  Pizza,
  Car,
  Plane,
  Ship,
  Building,
  School,
  Store,
  Hospital,
  Factory,
  X,
  Layout,
  Home,
  Briefcase,
  Sparkles,
  Folder,
  Zap,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconDefinition {
  key: string
  name: string
  icon: React.ReactNode
  category: string
  keywords: string[]
}

const ICON_CATEGORIES = {
  general: 'General',
  work: 'Work & Business',
  creative: 'Creative & Design',
  tech: 'Technology',
  nature: 'Nature',
  travel: 'Travel & Places',
  objects: 'Objects',
  symbols: 'Symbols',
}

const SPACE_ICONS: IconDefinition[] = [
  // General
  { key: 'home', name: 'Home', icon: <Home className="h-4 w-4" />, category: 'general', keywords: ['house', 'main'] },
  {
    key: 'star',
    name: 'Star',
    icon: <Star className="h-4 w-4" />,
    category: 'general',
    keywords: ['favorite', 'important'],
  },
  { key: 'heart', name: 'Heart', icon: <Heart className="h-4 w-4" />, category: 'general', keywords: ['love', 'like'] },
  {
    key: 'bookmark',
    name: 'Bookmark',
    icon: <Bookmark className="h-4 w-4" />,
    category: 'general',
    keywords: ['save', 'mark'],
  },
  {
    key: 'target',
    name: 'Target',
    icon: <Target className="h-4 w-4" />,
    category: 'general',
    keywords: ['goal', 'aim'],
  },
  {
    key: 'flame',
    name: 'Fire',
    icon: <Flame className="h-4 w-4" />,
    category: 'general',
    keywords: ['hot', 'trending'],
  },

  // Work & Business
  {
    key: 'briefcase',
    name: 'Briefcase',
    icon: <Briefcase className="h-4 w-4" />,
    category: 'work',
    keywords: ['work', 'job', 'business'],
  },
  {
    key: 'folder',
    name: 'Folder',
    icon: <Folder className="h-4 w-4" />,
    category: 'work',
    keywords: ['directory', 'files', 'organize'],
  },
  {
    key: 'calendar',
    name: 'Calendar',
    icon: <Calendar className="h-4 w-4" />,
    category: 'work',
    keywords: ['schedule', 'date', 'time'],
  },
  {
    key: 'clock',
    name: 'Clock',
    icon: <Clock className="h-4 w-4" />,
    category: 'work',
    keywords: ['time', 'schedule'],
  },
  {
    key: 'building',
    name: 'Building',
    icon: <Building className="h-4 w-4" />,
    category: 'work',
    keywords: ['office', 'company'],
  },
  {
    key: 'school',
    name: 'School',
    icon: <School className="h-4 w-4" />,
    category: 'work',
    keywords: ['education', 'learning'],
  },
  { key: 'store', name: 'Store', icon: <Store className="h-4 w-4" />, category: 'work', keywords: ['shop', 'retail'] },
  {
    key: 'hospital',
    name: 'Hospital',
    icon: <Hospital className="h-4 w-4" />,
    category: 'work',
    keywords: ['health', 'medical'],
  },
  {
    key: 'factory',
    name: 'Factory',
    icon: <Factory className="h-4 w-4" />,
    category: 'work',
    keywords: ['manufacturing', 'industry'],
  },

  // Creative & Design
  {
    key: 'sparkles',
    name: 'Sparkles',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'creative',
    keywords: ['magic', 'creative', 'inspiration'],
  },
  {
    key: 'palette',
    name: 'Palette',
    icon: <Palette className="h-4 w-4" />,
    category: 'creative',
    keywords: ['art', 'design', 'color'],
  },
  {
    key: 'camera',
    name: 'Camera',
    icon: <Camera className="h-4 w-4" />,
    category: 'creative',
    keywords: ['photo', 'picture'],
  },
  {
    key: 'music',
    name: 'Music',
    icon: <Music className="h-4 w-4" />,
    category: 'creative',
    keywords: ['audio', 'sound'],
  },
  {
    key: 'gamepad',
    name: 'Gaming',
    icon: <Gamepad2 className="h-4 w-4" />,
    category: 'creative',
    keywords: ['game', 'play'],
  },

  // Technology
  {
    key: 'code',
    name: 'Code',
    icon: <Code className="h-4 w-4" />,
    category: 'tech',
    keywords: ['programming', 'development'],
  },
  {
    key: 'database',
    name: 'Database',
    icon: <Database className="h-4 w-4" />,
    category: 'tech',
    keywords: ['data', 'storage'],
  },
  {
    key: 'shield',
    name: 'Shield',
    icon: <Shield className="h-4 w-4" />,
    category: 'tech',
    keywords: ['security', 'protection'],
  },
  {
    key: 'rocket',
    name: 'Rocket',
    icon: <Rocket className="h-4 w-4" />,
    category: 'tech',
    keywords: ['launch', 'startup', 'fast'],
  },
  {
    key: 'globe',
    name: 'Globe',
    icon: <Globe className="h-4 w-4" />,
    category: 'tech',
    keywords: ['world', 'internet', 'web'],
  },

  // Nature
  {
    key: 'sun',
    name: 'Sun',
    icon: <Sun className="h-4 w-4" />,
    category: 'nature',
    keywords: ['light', 'day', 'bright'],
  },
  { key: 'moon', name: 'Moon', icon: <Moon className="h-4 w-4" />, category: 'nature', keywords: ['night', 'dark'] },
  {
    key: 'cloud',
    name: 'Cloud',
    icon: <Cloud className="h-4 w-4" />,
    category: 'nature',
    keywords: ['weather', 'sky'],
  },
  {
    key: 'mountain',
    name: 'Mountain',
    icon: <Mountain className="h-4 w-4" />,
    category: 'nature',
    keywords: ['peak', 'outdoor'],
  },
  {
    key: 'trees',
    name: 'Trees',
    icon: <Trees className="h-4 w-4" />,
    category: 'nature',
    keywords: ['forest', 'nature', 'green'],
  },
  {
    key: 'flower',
    name: 'Flower',
    icon: <Flower className="h-4 w-4" />,
    category: 'nature',
    keywords: ['bloom', 'garden'],
  },
  { key: 'bug', name: 'Bug', icon: <Bug className="h-4 w-4" />, category: 'nature', keywords: ['insect', 'small'] },
  { key: 'fish', name: 'Fish', icon: <Fish className="h-4 w-4" />, category: 'nature', keywords: ['ocean', 'water'] },
  { key: 'bird', name: 'Bird', icon: <Bird className="h-4 w-4" />, category: 'nature', keywords: ['fly', 'tweet'] },
  { key: 'dog', name: 'Dog', icon: <Dog className="h-4 w-4" />, category: 'nature', keywords: ['pet', 'animal'] },
  { key: 'cat', name: 'Cat', icon: <Cat className="h-4 w-4" />, category: 'nature', keywords: ['pet', 'animal'] },

  // Travel & Places
  { key: 'car', name: 'Car', icon: <Car className="h-4 w-4" />, category: 'travel', keywords: ['drive', 'transport'] },
  {
    key: 'plane',
    name: 'Plane',
    icon: <Plane className="h-4 w-4" />,
    category: 'travel',
    keywords: ['flight', 'travel'],
  },
  { key: 'ship', name: 'Ship', icon: <Ship className="h-4 w-4" />, category: 'travel', keywords: ['boat', 'ocean'] },

  // Objects
  {
    key: 'coffee',
    name: 'Coffee',
    icon: <Coffee className="h-4 w-4" />,
    category: 'objects',
    keywords: ['drink', 'cafe'],
  },
  { key: 'pizza', name: 'Pizza', icon: <Pizza className="h-4 w-4" />, category: 'objects', keywords: ['food', 'eat'] },

  // Symbols
  {
    key: 'zap',
    name: 'Lightning',
    icon: <Zap className="h-4 w-4" />,
    category: 'symbols',
    keywords: ['energy', 'power', 'ideas'],
  },
  {
    key: 'trophy',
    name: 'Trophy',
    icon: <Trophy className="h-4 w-4" />,
    category: 'symbols',
    keywords: ['award', 'win'],
  },
  {
    key: 'crown',
    name: 'Crown',
    icon: <Crown className="h-4 w-4" />,
    category: 'symbols',
    keywords: ['king', 'royal'],
  },
  {
    key: 'gem',
    name: 'Gem',
    icon: <Gem className="h-4 w-4" />,
    category: 'symbols',
    keywords: ['diamond', 'valuable'],
  },
  { key: 'hash', name: 'Hash', icon: <Hash className="h-4 w-4" />, category: 'symbols', keywords: ['tag', 'number'] },
]

const RECENT_ICONS_KEY = 'filegraph-recent-space-icons'

function getRecentIcons(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_ICONS_KEY)
    return saved ? JSON.parse(saved) : ['home', 'briefcase', 'sparkles', 'folder', 'zap', 'target']
  } catch {
    return ['home', 'briefcase', 'sparkles', 'folder', 'zap', 'target']
  }
}

function addRecentIcon(iconKey: string) {
  try {
    const recent = getRecentIcons().filter((key) => key !== iconKey)
    recent.unshift(iconKey)
    localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(recent.slice(0, 12)))
  } catch {
    // Ignore localStorage errors
  }
}

export function getSpaceIcon(iconName?: string): React.ReactNode {
  if (!iconName) return <Layout className="h-4 w-4" />
  const iconDef = SPACE_ICONS.find((icon) => icon.key === iconName)
  return iconDef?.icon || <Layout className="h-4 w-4" />
}

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [recentIcons, setRecentIcons] = React.useState<string[]>([])

  React.useEffect(() => {
    setRecentIcons(getRecentIcons())
  }, [])

  const handleIconSelect = (iconKey: string) => {
    onChange(iconKey)
    addRecentIcon(iconKey)
    setRecentIcons(getRecentIcons())
  }

  const filteredIcons = React.useMemo(() => {
    let icons = SPACE_ICONS

    // Filter by category
    if (selectedCategory !== 'all') {
      icons = icons.filter((icon) => icon.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      icons = icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(query) ||
          icon.keywords.some((keyword) => keyword.toLowerCase().includes(query)),
      )
    }

    return icons
  }, [searchQuery, selectedCategory])

  const recentIconDefs = recentIcons
    .map((key) => SPACE_ICONS.find((icon) => icon.key === key))
    .filter(Boolean) as IconDefinition[]

  return (
    <div className="w-full max-w-lg">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-3 py-1.5 text-xs rounded-md transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground',
          )}>
          All
        </button>
        {Object.entries(ICON_CATEGORIES).map(([key, name]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              selectedCategory === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground',
            )}>
            {name}
          </button>
        ))}
      </div>

      {/* Recent Icons */}
      {recentIconDefs.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent</h4>
          <div className="grid grid-cols-8 gap-2">
            {recentIconDefs.slice(0, 8).map((icon) => (
              <button
                key={icon.key}
                type="button"
                onClick={() => handleIconSelect(icon.key)}
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center transition-all hover:scale-105',
                  value === icon.key
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                    : 'bg-muted hover:bg-muted/80',
                )}
                title={icon.name}>
                {icon.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icon Grid */}
      <div className="max-h-64 overflow-y-auto">
        {filteredIcons.length > 0 ? (
          <div className="grid grid-cols-8 gap-2">
            {filteredIcons.map((icon) => (
              <button
                key={icon.key}
                type="button"
                onClick={() => handleIconSelect(icon.key)}
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center transition-all hover:scale-105',
                  value === icon.key
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                    : 'bg-muted hover:bg-muted/80',
                )}
                title={icon.name}>
                {icon.icon}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No icons found</p>
          </div>
        )}
      </div>
    </div>
  )
}
