"use client";

import React, { createContext, useContext, useState } from "react";
import { ActiveModuleType, ChainType } from "@/types";

interface ChainScopeContextType {
  activeModule: ActiveModuleType;
  setActiveModule: (module: ActiveModuleType) => void;
  activeChain: ChainType;
  setActiveChain: (chain: ChainType) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const ChainScopeContext = createContext<ChainScopeContextType | undefined>(undefined);

export function ChainScopeProvider({ children }: { children: React.ReactNode }) {
  const [activeModule, setActiveModule] = useState<ActiveModuleType>("whale-radar");
  const [activeChain, setActiveChain] = useState<ChainType>("solana");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <ChainScopeContext.Provider
      value={{
        activeModule,
        setActiveModule,
        activeChain,
        setActiveChain,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </ChainScopeContext.Provider>
  );
}

export function useChainScope(): ChainScopeContextType {
  const context = useContext(ChainScopeContext);
  if (!context) {
    throw new Error("useChainScope must be used within a ChainScopeProvider");
  }
  return context;
}
