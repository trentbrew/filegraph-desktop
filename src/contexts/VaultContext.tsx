/**
 * Vault Context
 * 
 * Manages the current indexed vault path and provides it to components
 */

import React, { createContext, useContext, useState } from 'react';

interface VaultContextType {
  vaultPath: string | null;
  setVaultPath: (path: string) => void;
  isWithinVault: (path: string) => boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const VAULT_STORAGE_KEY = 'filegraph_vault_path';

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPathState] = useState<string | null>(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem(VAULT_STORAGE_KEY);
    console.log('[VaultContext] Restored vault path:', stored);
    return stored;
  });

  const setVaultPath = (path: string) => {
    console.log('[VaultContext] Setting vault path:', path);
    localStorage.setItem(VAULT_STORAGE_KEY, path);
    setVaultPathState(path);
  };

  const isWithinVault = (path: string): boolean => {
    if (!vaultPath) return true; // No vault set, allow all
    return path.startsWith(vaultPath);
  };

  return (
    <VaultContext.Provider value={{ vaultPath, setVaultPath, isWithinVault }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within VaultProvider');
  }
  return context;
}
