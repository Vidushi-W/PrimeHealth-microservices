import React from 'react';

// Card Component
export function Card({ children, className = '', hoverable = true, ...props }) {
  return (
    <div
      className={`panel p-6 transition ${
        hoverable ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Badge Component
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-brand-50 text-brand-700 border border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-rose-50 text-rose-700 border border-rose-200',
    sea: 'bg-sky-50 text-sky-700 border border-sky-200'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Button Component
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full';
  
  const variantsStyle = {
    primary: 'button-primary focus:ring-brand-300',
    secondary: 'button-secondary focus:ring-brand-200',
    outline: 'border border-brand-200 bg-white text-slate-700 hover:bg-brand-50 focus:ring-brand-200',
    ghost: 'text-brand-700 hover:bg-brand-50 focus:ring-brand-200',
    error: 'bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-200'
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button className={`${baseStyles} ${variantsStyle[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Input Component
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        className={`input ${
          error ? 'border-rose-500 focus:ring-rose-100' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}

// Select Component
export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        className={`input ${
          error ? 'border-rose-500 focus:ring-rose-100' : ''
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}

// Stat Card Component
export function StatCard({ icon, label, value, trend, className = '' }) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="text-3xl font-black text-slate-900">{value}</p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.label}
            </p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </Card>
  );
}

// Empty State Component
export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="mb-2 text-2xl font-black text-slate-900">{title}</h3>
      <p className="mx-auto mb-6 max-w-sm text-sm text-slate-600">{description}</p>
      {action && action}
    </div>
  );
}

// Loading Skeleton
export function Skeleton({ count = 1, height = 'h-4', className = '' }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`${height} bg-gray-200 rounded animate-pulse mb-3 ${className}`} />
      ))}
    </>
  );
}

// Alert Component
export function Alert({ type = 'info', title, message, onClose, className = '' }) {
  const types = {
    info: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', icon: 'ℹ️' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '✓' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
    error: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: '✕' }
  };

  const { bg, border, text, icon } = types[type];

  return (
    <div className={`${bg} ${border} rounded-2xl border p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1">
          {title && <p className={`font-semibold ${text}`}>{title}</p>}
          {message && <p className={`text-sm ${text}`}>{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// Modal Component
export function Modal({ isOpen, title, children, onClose, footer, className = '' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className={`mx-4 w-full max-w-2xl ${className}`} hoverable={false}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="mb-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-brand-100 pt-4">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
