'use client';
import { useEffect, useRef } from 'react';

/*
 * Site-wide pointer effects, applied by delegation so every page, form and
 * button gets them without per-component wiring. Everything is scoped to
 * `.site`, so the admin console is untouched.
 *
 *  - Cursor: a ring that trails the pointer and swells over anything clickable.
 *  - Magnetic: solid or outlined rounded buttons lean towards the cursor (opt in or out with
 *    data-magnetic / data-magnetic="off").
 *  - Spotlight: white cards light up softly under the cursor.
 *  - Ripple: a press ripples out from where the button was hit.
 *  - Parallax: --px / --py on <html> (-1..1) for anything that drifts with
 *    the pointer, like the cloud layers.
 */

const CARD =
  '.site :is(.rounded-2xl, .rounded-3xl):is(.bg-white, .bg-paper), .site [data-spotlight]';
const PRESSABLE = '.site :is(button, a, [role="button"], label[for])';
const CLICKABLE = 'a, button, [role="button"], label, select, summary, input[type="checkbox"], input[type="radio"]';

const transparent = (c: string) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)';

export function InteractionLayer() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const magneticCache = new WeakMap<HTMLElement, boolean>();

    let mx = -100;
    let my = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;
    let magnet: HTMLElement | null = null;
    let spot: HTMLElement | null = null;

    const isMagnetic = (el: HTMLElement) => {
      if (el.dataset.magnetic === 'off') return false;
      if (el.dataset.magnetic !== undefined) return true;
      const cached = magneticCache.get(el);
      if (cached !== undefined) return cached;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const ok =
        r.width <= 320 && r.height <= 64 &&
        parseFloat(s.borderTopLeftRadius) >= 8 &&
        (!transparent(s.backgroundColor) || s.borderTopWidth !== '0px') &&
        !el.closest('nav');
      magneticCache.set(el, ok);
      return ok;
    };

    const releaseMagnet = () => {
      if (!magnet) return;
      magnet.style.translate = '';
      magnet = null;
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      root.style.setProperty('--px', ((mx / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', ((my / window.innerHeight) * 2 - 1).toFixed(3));

      const target = e.target instanceof Element ? e.target : null;
      const inSite = !!target?.closest('.site');

      if (ring.current && dot.current) {
        const on = fine && !reduce && inSite && e.pointerType === 'mouse';
        ring.current.dataset.on = String(on);
        dot.current.dataset.on = String(on);
        const over = target?.closest(CLICKABLE);
        const text = target?.closest('input:not([type="checkbox"]):not([type="radio"]), textarea');
        ring.current.dataset.hover = String(!!over && !text);
        ring.current.dataset.text = String(!!text);
      }

      // Spotlight on the card under the cursor.
      const card = (target?.closest(CARD) as HTMLElement | null) ?? null;
      if (card !== spot) {
        spot?.classList.remove('fx-spot');
        spot = card;
        spot?.classList.add('fx-spot');
      }
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--sx', `${mx - r.left}px`);
        spot.style.setProperty('--sy', `${my - r.top}px`);
      }

      // Magnetic buttons.
      if (!fine || reduce) return;
      const btn = target?.closest(PRESSABLE) as HTMLElement | null;
      const next = btn && btn.closest('.site') && isMagnetic(btn) ? btn : null;
      if (next !== magnet) releaseMagnet();
      if (next) {
        magnet = next;
        const r = next.getBoundingClientRect();
        const dx = (mx - (r.left + r.width / 2)) * 0.28;
        const dy = (my - (r.top + r.height / 2)) * 0.36;
        next.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (ring.current) ring.current.dataset.down = 'true';
      if (reduce) return;
      const el = (e.target instanceof Element ? e.target.closest(PRESSABLE) : null) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;

      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const d = Math.max(r.width, r.height) * 2.2;
      const ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = ripple.style.height = `${d}px`;
      ripple.style.left = `${e.clientX - r.left}px`;
      ripple.style.top = `${e.clientY - r.top}px`;

      const restore: (() => void)[] = [];
      if (s.position === 'static') {
        el.style.position = 'relative';
        restore.push(() => { el.style.position = ''; });
      }
      if (s.overflow === 'visible') {
        el.style.overflow = 'hidden';
        restore.push(() => { el.style.overflow = ''; });
      }
      el.appendChild(ripple);
      window.setTimeout(() => {
        ripple.remove();
        restore.forEach((fn) => fn());
      }, 650);
    };

    const onUp = () => { if (ring.current) ring.current.dataset.down = 'false'; };
    const onLeave = () => {
      releaseMagnet();
      if (ring.current) ring.current.dataset.on = 'false';
      if (dot.current) dot.current.dataset.on = 'false';
    };

    const tick = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    if (fine && !reduce) raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      releaseMagnet();
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden className="fx-cursor-ring" data-on="false" />
      <div ref={dot} aria-hidden className="fx-cursor-dot" data-on="false" />
    </>
  );
}
