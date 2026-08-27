// Icons appear only where functional: map pin, close, back, fullscreen, arrow. One set,
// 1.25px stroke, never filled, never coloured. Nothing decorative goes in this file.

function Icon({ children, className = '', size = '1em', ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function MapPinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </Icon>
  );
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  );
}

export function ArrowIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </Icon>
  );
}

export function BackIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 12H4M11 19l-7-7 7-7" />
    </Icon>
  );
}

// Three plates at three sizes. The only icon in the app that names a mode rather than a
// direction, which is why it is the one control that carries a frame.
//
// It was two outlined rectangles first. At the 12px the top rail renders it, two small
// empty boxes are indistinguishable from missing glyphs — it read as tofu. Three strokes
// of different lengths read as a comparison at any size.
export function CompareIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 20V11M12 20V4M18 20v-6" />
        <rect x="3" y="3" width="12" height="12" />
      <rect x="9" y="9" width="12" height="12" />
    </Icon>
  );
}

export function FullscreenIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Icon>
  );
}



export function TowerIcon(props) {
  return (
    <Icon {...props}>
      <rect x="8" y="3" width="8" height="18" />
      <path d="M8 21h8M11 3v18M13 3v18M9.5 7h1M13.5 7h1M9.5 11h1M13.5 11h1M9.5 15h1M13.5 15h1" />
    </Icon>
  );
}

export function MenuIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

export function HomeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
    </Icon>
  );
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12.5l5 5L20 6" />
    </Icon>
  );
}
