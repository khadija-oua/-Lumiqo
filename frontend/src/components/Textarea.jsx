import { forwardRef, useEffect, useId, useRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, helper, error, id, autoExpand = false, value, className = '', ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id || auto;
  const innerRef = useRef(null);
  const setRefs = (el) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  useEffect(() => {
    if (!autoExpand || !innerRef.current) return;
    const el = innerRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value, autoExpand]);

  return (
    <div className="field">
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <textarea
        ref={setRefs}
        id={fieldId}
        value={value}
        className={`textarea ${className}`}
        aria-invalid={!!error}
        {...rest}
      />
      {error ? (
        <span className="field-error">{error}</span>
      ) : helper ? (
        <span className="field-helper">{helper}</span>
      ) : null}
    </div>
  );
});

export default Textarea;
