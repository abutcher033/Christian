'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAmbience } from '@/lib/ambience/engine';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ReaderSettings,
} from '@/lib/bible/storage';

type SettingsContextValue = {
  settings: ReaderSettings;
  update: (patch: Partial<ReaderSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    document.documentElement.dataset.largeTargets = settings.largeTargets ? '1' : '0';
    const ambience = getAmbience();
    ambience.setScene(settings.scene);
    ambience.setVolume(settings.volume);
    ambience.setMuted(!settings.soundOn);
  }, [settings, hydrated]);

  useEffect(() => {
    const unlock = () => {
      if (!settings.soundOn) return;
      void getAmbience().resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [settings.soundOn]);

  const update = (patch: Partial<ReaderSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used within SettingsProvider');
  return value;
}
