import { useEffect, useRef } from 'react';
import spyMusic from '../assets/spy.mp3';

/**
 * Arka plan müziğini yönetir.
 * play=true olduğunda müzik loop olarak çalar, false olduğunda fade out ile durur.
 */
export function useBgMusic(play, volumeScale = 1.0) {
  const audioRef = useRef(null);
  const fadeRef  = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(spyMusic);
      audioRef.current.loop   = true;
      audioRef.current.volume = 0;
    }

    const audio = audioRef.current;
    let isActive = true;

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
        const target = 0.5 * volumeScale;
        const step   = target / 30;
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = setInterval(() => {
          if (!isActive) {
             clearInterval(fadeRef.current);
             return;
          }
          // Eğer volume hedeften büyükse (örneğin menüden oyuna geçerken sesin kısılması gerekiyorsa)
          if (Math.abs(audio.volume - target) < 0.05) {
            audio.volume = target;
            clearInterval(fadeRef.current);
            fadeRef.current = null;
          } else if (audio.volume < target) {
            audio.volume = Math.min(target, audio.volume + step);
          } else if (audio.volume > target) {
            audio.volume = Math.max(target, audio.volume - step);
          }
        }, 50);
      };

      audio.play().then(() => {
        if (!isActive) {
          audio.pause();
          return;
        }
        startFadeIn();
      }).catch(() => {
        resumeRef = () => {
          if (!isActive) return;
          audio.play().then(() => {
            if (!isActive) {
              audio.pause();
              return;
            }
            startFadeIn();
            if (eventsAdded) {
              EVENTS.forEach(e => window.removeEventListener(e, resumeRef, true));
              eventsAdded = false;
            }
          }).catch(() => {});
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
  }, [play, volumeScale]);
}
