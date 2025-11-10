import { useEffect, useState } from 'react';
import './App.css';
import { API_ENDPOINTS } from './config';
import { redirectTo } from './navigation';
import CivilianDashboard from './dashboards/CivilianDashboard';
import ResponderDashboard from './dashboards/ResponderDashboard';
import CommanderDashboard from './dashboards/CommanderDashboard';
import type { UserRole, SessionUser, SessionResponse } from './types';

type AppProps = {
  onBeginLogin?: (url: string) => void;
};

type DashboardComponent = (props: { user: SessionUser }) => JSX.Element;

const DASHBOARD_COMPONENTS: Record<UserRole, DashboardComponent> = {
  civilian: CivilianDashboard,
  responder: ResponderDashboard,
  commander: CommanderDashboard,
};

const GoogleLogo = () => (
  <svg
    className="google-logo-svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.82-.07-1.64-.2-2.44H12v4.62h6.48a5.56 5.56 0 0 1-2.41 3.65v3.03h3.9c2.29-2.11 3.53-5.23 3.53-8.86Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 5.88-1.05 7.84-2.87l-3.9-3.03c-1.08.73-2.47 1.15-3.94 1.15-3.03 0-5.6-2.05-6.52-4.81H1.4v3.12A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.48 14.44a7.2 7.2 0 0 1 0-4.88V6.44H1.4a12 12 0 0 0 0 11.12l4.08-3.12Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.74c1.74 0 3.3.6 4.53 1.78l3.38-3.38A12 12 0 0 0 1.4 6.44l4.08 3.12C6.4 6.8 8.98 4.74 12 4.74Z"
    />
  </svg>
);

const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return 'civilian';

  if (role === 'civilian' || role === 'responder' || role === 'commander') {
    return role;
  }

  // fallback safety
  return 'civilian';
};

type DashboardViewProps = {
  user: SessionUser;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
};

const DashboardView = ({ user, onLogout, loggingOut }: DashboardViewProps) => {
  const activeRole = normalizeRole(user.role);
  const displayName = user.name?.trim() || user.email;
  const ActiveDashboard = DASHBOARD_COMPONENTS[activeRole] ?? CivilianDashboard;

  return (
    <div className="dashboard-shell">
      <header className="app-nav" role="banner">
        <div className="app-nav__brand">
          <img src="/logo/logo.png" alt="Roshni logo" className="app-nav__logo" />
          <span className="app-nav__title">ROSHNI</span>
        </div>
        <div className="app-nav__actions">
          <span className="app-nav__user">
            {displayName} <span className="app-nav__role">({activeRole})</span>
          </span>
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="dashboard-main" aria-label={`${activeRole} dashboard`}>
        <ActiveDashboard user={user} />
      </main>
    </div>
  );
};


function App({ onBeginLogin = redirectTo }: AppProps = {}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.session, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Unable to fetch session');

        const payload = (await response.json()) as SessionResponse;
        if (isMounted) {
          setUser(payload.user ?? null);
          setError(null);
        }
      } catch (fetchError) {
        if (!isMounted) return;
        if ((fetchError as DOMException).name === 'AbortError') return;
        setUser(null);
        setError('Unable to reach the authentication service. Please try again.');
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleLogin = () => {
    setError(null);
    onBeginLogin(API_ENDPOINTS.googleLogin);
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const response = await fetch(API_ENDPOINTS.logout, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to log out');
      setUser(null);
      setError(null);
    } catch {
      setError('Unable to contact the authentication service. Please retry.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (user) {
    return <DashboardView user={user} onLogout={handleLogout} loggingOut={loggingOut} />;
  }

  return (
    <main className="login-shell" aria-busy={checkingSession}>
      <section className="login-panel login-panel__left">
        <img src="/logo/logo.png" alt="Roshni logo" className="login-logo" />
        <div className="login-brand-copy">
          <p className="login-brand-text">ROSHNI</p>
          <p className="login-tagline">Community readiness starts with a single secure sign in.</p>
        </div>
      </section>

      <div className="login-divider" role="separator" aria-orientation="vertical" />

      <section className="login-panel login-panel__right">
        <p className="eyebrow">Civilian Access Portal</p>
        <h1>Sign in to continue</h1>

        {checkingSession && (
          <p className="status-text" aria-live="polite">
            Checking your session&hellip;
          </p>
        )}

        {!checkingSession && (
          <p className="status-text" aria-live="polite">
            You are not signed in yet.
          </p>
        )}

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="google-button"
          onClick={handleLogin}
          disabled={checkingSession}
        >
          <span className="google-button__icon" aria-hidden="true">
            <GoogleLogo />
          </span>
          Continue with Google
        </button>
      </section>
    </main>
  );
}

export default App;
