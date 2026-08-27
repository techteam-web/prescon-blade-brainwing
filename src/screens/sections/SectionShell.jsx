import { Screen, SplitLayout } from '../../layout/Screen';
import { SECTION_BY_ID } from '../../data/sections';

// Every section carries a title line: the menu label, ALL CAPS, in the same family,
// weight and casing as the menu row.
//
// This exists because the aperture transition (T3) needs something to morph the clicked
// menu row INTO. The brief says the row becomes "the destination page's title", but no
// section's headline equals its menu label — Flip morphs the geometry of matching
// content, and it cannot turn "The Vision" into "INTRODUCING THE FINEST EDGE OF MODERN
// BUSINESS". The title line is that match. Metrics are identical to the menu row on
// purpose, so the morph is pure translation and cannot betray itself.
export function SectionTitle({ id, className = '', bold = false, gradient = false }) {
  const section = SECTION_BY_ID[id];
  if (!section) return null;

  // Metrics and colour match the menu row exactly — same size, weight, casing, cream —
  // so the aperture Flip is pure translation and never has to animate colour. `bold` and
  // `gradient` are opt-in overrides for a screen that repositions this title away from
  // the Flip's landing spot (see Amenities) and so no longer needs the exact match.
  // The index is NOT repeated here: it Flips into the top rail instead, per T3.
  return (
    <span
      data-flip-id={`ttl:${id}`}
      className={`block text-subhead uppercase ${bold ? 'font-bold' : 'font-medium'} ${
        // Went through a multi-stop metallic gradient with a drop shadow for contrast;
        // asked back down to flat pure white, no gradient, no shadow.
        gradient ? 'text-white' : 'text-blade-cream'
      } ${className}`}
    >
      {section.label}
    </span>
  );
}

// The default section composition: text column left, visual right, vertically centred.
// Sections with a bespoke layout (Plans, Address, Views) use <Screen> directly.
export function SectionShell({ id, children, visual, ratio = 43, reverse = false, className = '' }) {
  return (
    <Screen id={id} className={className}>
      <SplitLayout
        ratio={ratio}
        reverse={reverse}
        text={
          <div className="flex min-h-0 flex-col justify-center gap-[1.6em]">
            <SectionTitle id={id} />
            {children}
          </div>
        }
        visual={visual}
      />
    </Screen>
  );
}

// A headline plus the copper hairline that draws beneath it at the end of the sweep.
export function SectionHeadline({ lines, className = '', size = 'text-headline' }) {
  return (
    <div className="flex flex-col gap-[0.7em]">
      <h1 data-headline className={`${size} text-blade-cream ${className}`}>
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <span
        data-headline-rule
        aria-hidden="true"
        className="h-px w-[38%] origin-left bg-blade-copper"
      />
    </div>
  );
}

export function Body({ children, className = '', ...rest }) {
  return (
    <p className={`max-w-[46ch] text-body text-blade-cream/80 ${className}`} {...rest}>
      {children}
    </p>
  );
}
