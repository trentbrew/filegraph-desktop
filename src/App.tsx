import './App.css';
import { useState } from 'react';
import { FileStructure } from './components/app/fileStructure';
import { VaultSelector } from './components/app/vaultSelector';
import { StatusBar } from './components/app/statusBar';
import { Toaster } from '@/components/ui/sonner';
import { VaultProvider } from './contexts/VaultContext';

function AppContent() {
  const [showVaultSelector, setShowVaultSelector] = useState(false);

  const handleOpenVaultSelector = () => {
    console.log('[App] Opening vault selector');
    setShowVaultSelector(true);
  };

  return (
    <div className="h-screen w-screen p-0 m-0 overflow-hidden bg-transparent rounded-lg">
      <div className="h-full flex flex-col overflow-hidden rounded-[12px] bg-background shadow-2xl">
        {/* Temporary test button - remove after testing */}
        {/* <button
          onClick={handleOpenVaultSelector}
          className="absolute top-4 left-4 z-50 bg-blue-500 text-white px-4 py-2 rounded"
        >
          TEST: Open Modal (isOpen: {showVaultSelector.toString()})
        </button> */}

        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <FileStructure />
          </div>
          <StatusBar
            onIndexFolder={handleOpenVaultSelector}
            onVaultSwitch={handleOpenVaultSelector}
          />
          <VaultSelector
            isOpen={showVaultSelector}
            onClose={() => setShowVaultSelector(false)}
            onVaultSelected={() => {}}
          />
          <Toaster />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
}

export default App;
