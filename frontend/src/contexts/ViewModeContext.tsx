"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getRolePermissions } from '@/models/types/auth';

export type ViewMode = 'admin' | 'user';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canToggleMode: boolean;
  isAdminMode: boolean;
  isUserMode: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
}

export function ViewModeProvider({ children }: ViewModeProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('user');

  // Check if user has admin/recruiter permissions
  const canToggleMode = React.useMemo(() => {
    if (!isAuthenticated || !user) return false;

    const permissions = getRolePermissions(user.role as "user" | "admin" | "recruiter");

    // Only admin and recruiter can toggle modes
    return permissions.canAccessAdminPanel || permissions.canReviewApplications;
  }, [user, isAuthenticated]);

  // Reset to user mode when user logs out or loses permissions
  useEffect(() => {
    if (!canToggleMode) {
      setViewMode('user');
    }
  }, [canToggleMode]);

  // Persist view mode in localStorage
  useEffect(() => {
    if (canToggleMode) {
      const savedMode = localStorage.getItem('viewMode') as ViewMode;
      if (savedMode && (savedMode === 'admin' || savedMode === 'user')) {
        setViewMode(savedMode);
      }
    }
  }, [canToggleMode]);

  const handleSetViewMode = (mode: ViewMode) => {
    if (canToggleMode) {
      setViewMode(mode);
      localStorage.setItem('viewMode', mode);
    }
  };

  const value: ViewModeContextType = {
    viewMode,
    setViewMode: handleSetViewMode,
    canToggleMode,
    isAdminMode: viewMode === 'admin',
    isUserMode: viewMode === 'user',
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}