import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus() {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [registrationError, setRegistrationError] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() { setReady(true); },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      navigator.serviceWorker.ready.then(() => setReady(true));
    },
    onRegisterError() { setRegistrationError(true); },
  });

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) navigator.serviceWorker?.getRegistration(import.meta.env.BASE_URL).then(registration => registration?.update()).catch(() => {});
    };
    const beforeInstall = event => { event.preventDefault(); setInstallPrompt(event); };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return <>
    <div className="pwa-controls">
      <span className="offline-status" role="status">{registrationError ? 'Offline setup unavailable' : ready ? online ? 'Available offline' : 'Offline · ready to study' : online ? 'Preparing offline access…' : 'Offline · download pending'}</span>
      {installPrompt && <button className="button install-button" onClick={install}>Install app</button>}
    </div>
    {needRefresh && <div className="update-prompt" role="status"><p>A new version of MCQer and its shared questions is ready. Reload when you finish practicing.</p><div className="row-actions"><button className="button primary" onClick={() => updateServiceWorker(true)}>Reload to update</button><button className="button secondary" onClick={() => setNeedRefresh(false)}>Later</button></div></div>}
  </>;
}
