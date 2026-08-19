import { useRef } from 'react';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';
import { getRender } from '../data/renders';
import { ArrowIcon } from './Icons';

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

/* ------------------------------------------------------------ EnterPortal */

// The landing's single call to action, and the only framed control in the app.
//
// Every other control here is a label over a hairline, which is right for a rail you
// have already learned and wrong for the one thing a first-time visitor has to find:
// nothing about a line of tracked-out copper says "press me". So this one is framed, and
// it moves on its own — a light travels the frame every few seconds, unprompted, which
// is what makes the eye come back to it. On hover the copper fills in behind the label
// at the blade angle and the type inverts to the ground colour.
//
// It stays inside the system: copper, cream, one angle, no radius, no glow.
//
// `size="sm"` is the top-rail variant — same control, same three gestures, tightened so
// it sits beside MENU and HOME without shouting over them.
export function EnterPortal({
  children,
  onClick,
  className = '',
  disabled = false,
  size = 'md',
  icon = <ArrowIcon size="1.05em" />,
  ...rest
}) {
  const root = useRef(null);

  useGSAP(
    (self) => {
      const q = self.selector;
      // The attractor. A long pause between passes so it reads as an occasional
      // catch of light rather than as a loading shimmer.
      gsap.fromTo(
        q('[data-portal-sheen]'),
        { xPercent: -130 },
        {
          xPercent: 130,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 2.6,
        },
      );
      // Self-healing rest state for the pieces the hover handler drives — StrictMode's
      // mount → cleanup → mount never runs the hover leave state, so the hit-sheen
      // needs its own reset here rather than trusting a prior pointer event.
      gsap.set(q('[data-portal-sheen-hit]'), { xPercent: -130, autoAlpha: 0 });
    },
    { scope: root },
  );

  const { contextSafe } = useGSAP({ scope: root });

  const hover = contextSafe((on) => {
    if (disabled) return;
    const vars = { duration: 0.5, ease: E.out, overwrite: 'auto' };
    gsap.to('[data-portal-fill]', { scaleX: on ? 1 : 0, ...vars });
    gsap.to('[data-control-label]', {
      color: on ? 'var(--color-blade-black)' : 'var(--color-blade-copper)',
      letterSpacing: on ? '0.46em' : '0.4em',
      scale: on ? 1.03 : 1,
      ...vars,
    });
    gsap.to('[data-portal-mark]', {
      color: on ? 'var(--color-blade-black)' : 'var(--color-blade-copper)',
      ...vars,
    });
    // A second, faster sheen fired on contact — the ambient loop keeps drawing the eye
    // when idle, this one answers the cursor directly.
    if (on) {
      gsap.fromTo(
        '[data-portal-sheen-hit]',
        { xPercent: -130, autoAlpha: 0.85 },
        { xPercent: 130, duration: 0.6, ease: 'power2.out', overwrite: 'auto' },
      );
    }
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
      className={`enter-portal group disabled:opacity-40 ${
        size === 'sm' ? 'enter-portal--sm' : ''
      } ${className}`}
      {...rest}
    >
      <span aria-hidden="true" className="enter-portal-fill">
        <span data-portal-fill className="enter-portal-fill-bar" />
      </span>
      <span data-portal-sheen aria-hidden="true" className="enter-portal-sheen" />
      <span data-portal-sheen-hit aria-hidden="true" className="enter-portal-sheen" />

      <span data-control-label className="eyebrow enter-portal-label">
        {children}
      </span>

      <span data-portal-mark className="enter-portal-label flex items-center gap-[0.9em] text-blade-copper">
        {icon}
      </span>

      {/* The intro sequence draws this rule as the control arrives — keeping the marker
          means T6 needs no knowledge of which control it is animating. */}
      <span data-control-rule aria-hidden="true" className="sr-only" />
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
