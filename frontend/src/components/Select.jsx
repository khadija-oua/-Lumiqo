import { forwardRef, useId } from 'react';

const Select = forwardRef(function Select(
  { label, helper, error, options = [], id, className = '', children, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <div className="field">
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={`select ${className}`}
        aria-invalid={!!error}
        {...rest}
      >
        {children ||
          options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
      {error ? (
        <span className="field-error">{error}</span>
      ) : helper ? (
        <span className="field-helper">{helper}</span>
      ) : null}
    </div>
  );
});

export default Select;
