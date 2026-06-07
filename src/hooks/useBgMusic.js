import { useEffect, useRef } from 'react';
import spyMusic from '../assets/spy.mp3';

/**
 * Arka plan müziğini yönetir.
 * play=true olduğunda müzik loop olarak çalar, false olduğunda fade out ile durur.
 */
export function useBgMusic(play) {
  const audioRef = useRef(null);
  const fadeRef  = useRef(null);

  useEffect(() => {
    // İlk kullanımda Audio nesnesini oluştur
    if (!audioRef.current) {
      audioRef.current = new Audio(spyMusic);
      audioRef.current.loop   = true;
      audioRef.current.volume = 0;
    }

    const audio = audioRef.current;

    // Devam eden fade işlemini temizle
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    if (play) {
      // Müziği başlat ve fade in uygula
      audio.play().catch(() => {
        // Tarayıcı autoplay politikası: ilk kullanıcı etkileşiminde tekrar dene
        const resume = () => {
          audio.play().catch(() => {});
          window.removeEventListener('pointerdown', resume);
        };
        window.addEventListener('pointerdown', resume);
      });

      // Fade in: 0 → 0.5 (1.5 saniye)
      const target = 0.5;
      const step   = target / 30; // 30 adım
      fadeRef.current = setInterval(() => {
        if (audio.volume + step >= target) {
          audio.volume = target;
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        } else {
          audio.volume += step;
        }
      }, 50);
    } else {
      // Fade out: mevcut ses → 0 (1 saniye)
      const step = audio.volume / 20;
      if (step === 0) return;
      fadeRef.current = setInterval(() => {
        if (audio.volume - step <= 0) {
          audio.volume = 0;
          audio.pause();
          audio.currentTime = 0;
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        } else {
          audio.volume -= step;
        }
      }, 50);
    }

    return () => {
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    };
  }, [play]);
}
