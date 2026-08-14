import { useRef } from 'react';
import { useOverflowGuard } from '../hooks/useOverflowGuard';

// Every screen is exactly the viewport. Nothing else in the app sets a height, and no
// component may introduce a scroll container.
//
// Screen never sets its own opacity or transform: the transition director owns those,
// and a component fighting it for the same property is the classic way an overlapping
// swap goes wrong.

export function Screen({ id, className = '', children, padded = true }) {
  const ref = useRef(null);
  useOverflowGuard(ref, id);

  return (
    <section
      ref={ref}
      data-screen-root={id}
      className={`relative h-full w-full overflow-hidden ${
        padded ? 'screen-inset' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

// The standard composition: text column left, visual right, both vertically centred.
//
// min-h-0 / min-w-0 on both tracks is not optional. A grid child defaults to
// min-height:auto, which lets content push the track past the row and out of the
// viewport — silently, and only at some widths. It is the single most common cause of
// overflow in exactly this layout.
export function SplitLayout({
  text,
  visual,
  ratio = 43,
  reverse = false,
  className = '',
  visualClassName = '',
}) {
  return (
    <div
      className={`grid h-full w-full min-h-0 gap-[4%] max-md:block max-md:gap-0 ${className}`}
      style={{ gridTemplateColumns: `${ratio}fr ${100 - ratio}fr` }}
    >
      {/* Below md the visual drops behind the content as a scrimmed background layer,
          so the text has the whole viewport rather than 55% of a phone. */}
      <div
        className={`relative min-h-0 min-w-0 overflow-hidden md:order-none ${
          reverse ? 'md:order-1' : 'md:order-2'
        } max-md:pointer-events-none max-md:absolute max-md:inset-0 max-md:opacity-20 ${visualClassName}`}
      >
        {visual}
      </div>
      <div
        className={`relative flex min-h-0 min-w-0 flex-col justify-center overflow-hidden ${
          reverse ? 'md:order-2' : 'md:order-1'
        } max-md:h-full`}
      >
        {text}
      </div>
    </div>
  );
}

// A block of headline lines. Marked so the director's SplitText can find it, and so the
// masked line wipe has something to wipe.
export function Headline({ lines, className = '', as: Tag = 'h1' }) {
  return (
    <Tag data-headline className={`text-headline ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </Tag>
  );
}
