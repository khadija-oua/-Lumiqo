export default function Card({ header, footer, padded = true, className = '', children }) {
  const bodyClass = padded ? 'card-body' : '';
  return (
    <div className={`card ${className}`}>
      {header ? <div className="card-header">{header}</div> : null}
      <div className={bodyClass}>{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
