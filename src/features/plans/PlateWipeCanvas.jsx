import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createPlateWipe } from './plateWipeGL';

// A thin React shell around plateWipeGL: owns the canvas element and keeps it sized to
// its container. The actual frame-by-frame drive comes from Plans.jsx, which calls
// `render(progress)` on the exposed handle from inside a GSAP tween — this component
// has no animation logic of its own.
export const PlateWipeCanvas = forwardRef(function PlateWipeCanvas(_props, ref) {
  const canvasRef = useRef(null);
  const renderer = useRef(null);

  useImperativeHandle(ref, () => ({
    render(progress) {
      renderer.current?.render(progress);
    },
    get ready() {
      return !!renderer.current;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderer.current = createPlateWipe(canvas);
    if (!renderer.current) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      renderer.current?.resize(width, height, dpr);
    });
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      ro.disconnect();
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
    />
  );
});
