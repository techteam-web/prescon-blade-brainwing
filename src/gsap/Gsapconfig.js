// The single GSAP entry point. No component imports from 'gsap' directly — this is the
// only module in src/ allowed to, and the acceptance checklist greps for it.

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(useGSAP, Flip, CustomEase, SplitText, Observer);

// Only three eases exist in this app. Every one has a long decelerating tail — that is
// the whole difference between "expensive" and "poppy".
CustomEase.create('blade', '0.16, 1, 0.3, 1'); // primary — heavy, decisive
CustomEase.create('bladeIn', '0.7, 0, 0.84, 0'); // accelerate away
CustomEase.create('bladeSoft', '0.33, 1, 0.68, 1'); // micro-interactions

export const D = {
  wipe: 1.15,
  reveal: 0.9,
  micro: 0.32,
  stagger: 0.055,
  hold: 0.12,
};

export const E = {
  out: 'blade',
  in: 'bladeIn',
  soft: 'bladeSoft',
};

gsap.defaults({ ease: E.out, duration: D.reveal });

// Read live rather than cached: a user can change the OS setting mid-session, and the
// director asks on every transition build.
const RM = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export const prefersReducedMotion = () => !!RM?.matches;

// Transitions shorten by 25% below the md breakpoint but keep the same mechanisms.
const NARROW =
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;

export const durationScale = () => (NARROW?.matches ? 0.75 : 1);

export { gsap, useGSAP, Flip, CustomEase, SplitText, Observer };
