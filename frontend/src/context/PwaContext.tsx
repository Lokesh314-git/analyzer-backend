import React, { createContext, useContext, useState, useEffect } from 'react';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  showIosGuide: boolean;
  setShowIosGuide: (show: boolean) => void;
  promptInstall: () => Promise<boolean>;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIos: false,
  showIosGuide: false,
  setShowIosGuide: () => {},
  promptInstall: async () => false,
  updateAvailable: false,
  applyUpdate: () => {}
});

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone display mode
    const checkStandalone = () => {
      const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const installed = isMediaStandalone || isIosStandalone || isAndroidApp;
      setIsInstalled(installed);
      return installed;
    };

    const standalone = checkStandalone();

    // 2. Detect iOS (Safari)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    // 3. Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setIsInstallable(true);
      }
    };

    // 4. App installed handler
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      setShowIosGuide(false);
      console.log('[PWA] Semester Marks Analytics successfully installed as standalone app.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for display-mode media query change (e.g. desktop window popped out)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      // Safari fallback
      mediaQuery.addListener(handleMediaChange);
    }

    // 5. Service Worker Update Listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (isIos && !isInstalled) {
      setShowIosGuide(true);
      return false;
    }

    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the installation prompt.');
      setIsInstallable(false);
      setDeferredPrompt(null);
      return true;
    } else {
      console.log('[PWA] User dismissed the installation prompt.');
      return false;
    }
  };

  const applyUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: (!isInstalled && (isInstallable || (isIos && !isInstalled))),
        isInstalled,
        isIos,
        showIosGuide,
        setShowIosGuide,
        promptInstall,
        updateAvailable,
        applyUpdate
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => useContext(PwaContext);

