import { useRef } from 'react';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';
import { getRender } from '../data/renders';

/* ---------------------------------------------------------------- Eyebrow */

export function Eyebrow({ children, className = '', landing = false, ...rest }) {
  return (
    <span className={`eyebrow block ${landing ? 'eyebrow-landing' : ''} ${className}`} {...rest}>
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Hairline */

// The app's only divider. `blade` skews it to 12° — the single graphic idea.
export function Hairline({ className = '', blade = false, vertical = false, tone = 'copper' }) {
  const color = tone === 'copper' ? 'text-blade-copper' : 'text-blade-ink';
  return (
    <span
      aria-hidden="true"
      className={`block ${color} ${vertical ? 'w-px' : 'h-px w-full'} ${
        blade ? 'skew-blade' : ''
      } ${className}`}
      style={{ background: 'currentColor' }}
    />
  );
}

/* ---------------------------------------------------------------- Control */

// Never a filled button. A label over a copper hairline that extends on hover, with the
// label's tracking opening by 0.04em. Three properties, one gesture, 0.32s.
export function Control({ children, onClick, className = '', disabled = false, ...rest }) {
  const root = useRef(null);

  // Selector strings inside contextSafe resolve within `scope`, so the handlers never
  // touch root.current directly.
  const { contextSafe } = useGSAP({ scope: root });

  const hover = contextSafe((on) => {
    if (disabled) return;
    gsap.to('[data-control-rule]', { scaleX: on ? 1.4 : 1, duration: D.micro, ease: E.soft });
    gsap.to('[data-control-label]', {
      letterSpacing: on ? '0.44em' : '0.4em',
      duration: D.micro,
      ease: E.soft,
    });
  });

  const enter = () => hover(true);
  const leave = () => hover(false);

  return (
    <button
      ref={root}
      type="button"
      onClick={onClick}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
      disabled={disabled}
      className={`group inline-flex flex-col items-start gap-[0.6em] disabled:opacity-40 ${className}`}
      {...rest}
    >
      <span data-control-label className="eyebrow">
        {children}
      </span>
      <span
        data-control-rule
        data-control-hairline
        aria-hidden="true"
        className="hairline w-full origin-left bg-blade-copper"
      />
    </button>
  );
}

/* ------------------------------------------------------------ RenderImage */

// Every image in the app goes through here: WebP srcSet, explicit dimensions, LQIP
// background, async decode. A null id renders nothing — a section with no mapped render
// keeps a structurally empty visual slot rather than showing placeholder art.
export function RenderImage({
  id,
  className = '',
  imgClassName = '',
  priority = false,
  sizes = '100vw',
  alt,
}) {
  const render = getRender(id);
  if (!render) return null;

  return (
    <picture data-overflow-ok className={`block h-full w-full ${className}`}>
      <img
        data-hero
        src={render.src}
        srcSet={render.srcSet}
        sizes={sizes}
        width={render.width}
        height={render.height}
        alt={alt ?? render.alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={`h-full w-full object-cover ${imgClassName}`}
        style={{
          backgroundImage: `url(${render.lqip})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </picture>
  );
}

/* -------------------------------------------------------------- CountUp */

// Counts once on entry, never loops. gsap.to on a plain object, per the brief.
export function CountUp({ to, decimals = 0, duration = 1.2, delay = 0, className = '' }) {
  const el = useRef(null);

  useGSAP(
    () => {
      if (to == null || !el.current) return;
      const box = { v: 0 };
      el.current.textContent = (0).toFixed(decimals);
      gsap.to(box, {
        v: to,
        duration,
        delay,
        ease: E.out,
        onUpdate: () => {
          if (el.current) el.current.textContent = box.v.toFixed(decimals);
        },
      });
    },
    { dependencies: [to, decimals, duration, delay] },
  );

  return <span ref={el} className={className} />;
}
