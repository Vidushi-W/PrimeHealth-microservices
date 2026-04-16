import { Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-100/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              PrimeHealth
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Doctor Management Dashboard
            </h1>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                location.pathname === '/'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                location.pathname === '/profile'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export default Layout;
