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

    if (play) {
      // Çalması gerekiyorsa çalmayı dene
      const tryPlay = () => {
        if (audio.paused) {
          audio.play().then(() => {
            if (isActive) startFadeIn();
          }).catch(() => {
            // Autoplay kısıtlamasına takıldı, etkileşim beklenecek
          });
        } else {
          startFadeIn();
        }
      };

      tryPlay();

      // Eğer tarayıcı autoplay'i engellediyse, ekrana ilk tıklamada tekrar deniyoruz.
      // Audio çalıyorsa zaten if (audio.paused) false döner ve kod yük oluşturmaz.
      const interactionHandler = () => {
        if (!isActive || !play) return;
        if (audio.paused) {
          audio.play().then(() => {
            if (isActive) startFadeIn();
          }).catch(() => {});
        }
      };

      window.addEventListener('click', interactionHandler, { capture: true });
      window.addEventListener('pointerdown', interactionHandler, { capture: true });
      window.addEventListener('keydown', interactionHandler, { capture: true });

      return () => {
        isActive = false;
        if (fadeRef.current) clearInterval(fadeRef.current);
        window.removeEventListener('click', interactionHandler, { capture: true });
        window.removeEventListener('pointerdown', interactionHandler, { capture: true });
        window.removeEventListener('keydown', interactionHandler, { capture: true });
      };
    } else {
      // Sessize alma (Mute) -> Sesi yavaşça kıs ve duraklat
      const step = audio.volume / 20;
      if (step > 0 && audio.volume > 0) {
        fadeRef.current = setInterval(() => {
          if (audio.volume - step <= 0) {
            audio.volume = 0;
            audio.pause();
            // Kaldığı yerden devam etmesi için currentTime = 0 kullanmıyoruz
            clearInterval(fadeRef.current);
            fadeRef.current = null;
          } else {
            audio.volume -= step;
          }
        }, 50);
      } else {
        audio.pause();
      }

      return () => {
        isActive = false;
        if (fadeRef.current) clearInterval(fadeRef.current);
      };
    }
  }, [play, volumeScale]);
}
