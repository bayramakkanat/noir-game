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
    if (!audioRef.current) {
      audioRef.current = new Audio(spyMusic);
      audioRef.current.loop   = true;
      audioRef.current.volume = 0;
    }

    const audio = audioRef.current;

    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    if (play) {
      const startFadeIn = () => {
        const target = 0.5;
        const step   = target / 30;
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = setInterval(() => {
          if (audio.volume + step >= target) {
            audio.volume = target;
            clearInterval(fadeRef.current);
            fadeRef.current = null;
          } else {
            audio.volume += step;
          }
        }, 50);
      };

      audio.play().then(() => {
        startFadeIn();
      }).catch(() => {
        // Mobil dahil tüm etkileşim eventlerini dinle
        const EVENTS = ['touchend', 'click', 'keydown', 'pointerdown'];

        const resume = () => {
          audio.play().then(() => {
            startFadeIn();
          }).catch(() => {});
          EVENTS.forEach(e => window.removeEventListener(e, resume));
        };

        EVENTS.forEach(e => window.addEventListener(e, resume, { once: true }));
      });
    } else {
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
