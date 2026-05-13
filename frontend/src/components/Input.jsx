import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  { label, helper, error, id, className = '', ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <div className="field">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`input ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-err`} className="field-error">
          {error}
        </span>
      ) : helper ? (
        <span id={`${inputId}-help`} className="field-helper">
          {helper}
        </span>
      ) : null}
    </div>
  );
});

export default Input;
