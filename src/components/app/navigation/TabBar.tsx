import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tab } from './Tab';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TabData {
  id: string;
  title: string;
  path: string;
  navigationHistory: string[];
  historyIndex: number;
}

interface TabBarProps {
  tabs: TabData[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  className?: string;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  className = '',
}: TabBarProps) {
  return (
    <div className={`flex items-center bg-muted/30 border-b border-border/50 ${className}`}>
      <ScrollArea className="flex-1">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              title={tab.title}
              isActive={tab.id === activeTabId}
              onSelect={() => onTabSelect(tab.id)}
              onClose={() => onTabClose(tab.id)}
            />
          ))}
        </div>
      </ScrollArea>
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewTab}
        className="h-9 w-9 p-0 shrink-0 rounded-none border-l border-border/50"
        title="New Tab"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
