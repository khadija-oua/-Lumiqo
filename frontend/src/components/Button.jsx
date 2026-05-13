import Spinner from './Spinner';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconOnly = false,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    iconOnly ? 'btn-icon-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
