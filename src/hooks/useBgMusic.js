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
    let isActive = true; // Hook'un hala 'play' modunda geçerli olup olmadığını takip eder

    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    let eventsAdded = false;
    let resumeRef = null;
    const EVENTS = ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'];

    if (play) {
      const startFadeIn = () => {
        if (!isActive) return;
        const target = 0.5;
        const step   = target / 30;
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = setInterval(() => {
          if (!isActive) {
             clearInterval(fadeRef.current);
             return;
          }
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
        if (isActive) startFadeIn();
      }).catch(() => {
        // Mobil dahil tüm etkileşim eventlerini dinle (capture phase)
        resumeRef = () => {
          if (!isActive) return;
          audio.play().then(() => {
            if (isActive) startFadeIn();
            if (eventsAdded) {
              EVENTS.forEach(e => window.removeEventListener(e, resumeRef, true));
              eventsAdded = false;
            }
          }).catch(() => {
            // Eğer Safari touchstart'ı geçerli saymazsa başarısız olur.
          });
        };

        EVENTS.forEach(e => window.addEventListener(e, resumeRef, { capture: true }));
        eventsAdded = true;
      });
    } else {
      const step = audio.volume / 20;
      if (step > 0) {
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
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    }

    return () => {
      isActive = false;
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
      if (eventsAdded && resumeRef) {
        EVENTS.forEach(e => window.removeEventListener(e, resumeRef, true));
      }
    };
  }, [play]);
}
