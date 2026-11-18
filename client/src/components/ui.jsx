import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, AlertCircle, X } from 'lucide-react';

/* ---------- PageHeader ---------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ height = 16, width = '100%', style }) {
  return <span className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

/* ---------- StatCard ---------- */
export function StatCard({ title, value, icon: Icon, tone = 'primary', hint, hintTone, to, loading }) {
  const content = (
    <>
      <div className="stat-card-head">
        <span className="stat-card-title">{title}</span>
        <div className={`stat-icon ${tone}`} aria-hidden="true">
          {Icon && <Icon size={20} />}
        </div>
      </div>
      {loading ? <Skeleton height={32} width="55%" /> : <div className="stat-value">{value}</div>}
      {!loading && hint && (
        <span className={`stat-hint ${hintTone || ''}`}>
          {hint}
          {to && <ArrowUpRight size={12} aria-hidden="true" />}
        </span>
      )}
    </>
  );

  if (to && !loading) {
    return (
      <Link to={to} className="stat-card stat-card-link" aria-label={`${title}: ${value}`}>
        {content}
      </Link>
    );
  }
  return <article className="stat-card">{content}</article>;
}

/* ---------- Panel ---------- */
export function Panel({ title, subtitle, to, linkLabel = 'View details', children, footer, flush, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="panel-link">
            {linkLabel} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
      {footer && <div className="panel-footer">{footer}</div>}
    </section>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-6)' }}>
      {Icon && <Icon className="empty-state-icon" aria-hidden="true" />}
      {title && <p className="empty-state-title">{title}</p>}
      {text && <p className="empty-state-text">{text}</p>}
      {action}
    </div>
  );
}

/* ---------- Toasts (replace alert()) ---------- */
const listeners = new Set();
let nextId = 1;

/** toast('Saved'), toast('Something failed', 'error') */
export function toast(message, type = 'success') {
  const item = { id: nextId++, message, type };
  listeners.forEach((fn) => fn(item));
}

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== item.id)), 4500);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const dismiss = (id) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}