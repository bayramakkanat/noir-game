import { useEffect, useRef } from 'react';

/**
 * Ekranın kapanmasını önler (WakeLock API).
 * `active` true olduğunda kilidi alır, false olduğunda serbest bırakır.
 * Sekme arka plana geçerse tarayıcı kilidi otomatik düşürür;
 * sekme tekrar öne gelince yeniden alır.
 */
export function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active) {
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      return;
    }

    if (!('wakeLock' in navigator)) return; // Desteklenmiyor, sessizce geç

    let cancelled = false;

    async function acquire() {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
        lockRef.current.addEventListener('release', () => {
          if (!cancelled) lockRef.current = null;
        });
      } catch {
        // İzin reddedildi veya başka hata — sessizce geç
      }
    }

    acquire();

    // Sekme arka plandan öne gelince yeniden al (tarayıcı düşürmüş olabilir)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        acquire();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
