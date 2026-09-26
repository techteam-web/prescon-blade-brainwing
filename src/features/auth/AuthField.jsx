// A labelled underline input — the same "line, not a box" language as Hairline and
// Control elsewhere in the app, applied to a form field instead of a button.
export function AuthField({ label, error, className = '', inputRef, ...rest }) {
  return (
    <label className={`flex flex-col gap-[0.7em] ${className}`}>
      <span className="eyebrow" style={{ letterSpacing: '0.3em' }}>
        {label}
      </span>
      <input
        ref={inputRef}
        className="w-full border-0 border-b border-blade-ink bg-transparent pb-[0.5em] text-[1.05rem] text-blade-cream outline-none placeholder:text-blade-cream/30 focus:border-blade-copper"
        {...rest}
      />
      {error ? (
        <span className="text-[0.8rem] text-blade-rose" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
