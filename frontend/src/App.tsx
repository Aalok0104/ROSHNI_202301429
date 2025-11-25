import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import './App.css';
import './components/commander/commanderStyles.css';
import { API_ENDPOINTS } from './config';
import { redirectTo } from './navigation';
import CivilianDashboard from './dashboards/CivilianDashboard';
import ResponderDashboard from './dashboards/ResponderDashboard';
import CommanderDashboard from './dashboards/CommanderDashboard';
import CommanderHome from './dashboards/CommanderHome';
import CommanderLogs from './dashboards/CommanderLogs';
import CommanderDisasters from './dashboards/CommanderDisasters';
import CommanderTeams from './dashboards/CommanderTeams';
import RegistrationForm from './components/RegistrationForm';
import type { RegistrationData } from './components/RegistrationForm';
import type { UserRole, SessionUser } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

type AppProps = {
  onBeginLogin?: (url: string) => void;
};

type DashboardComponent = ComponentType<{ user: SessionUser }>;

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
  const displayName = user.email;
  const ActiveDashboard = DASHBOARD_COMPONENTS[activeRole] ?? CivilianDashboard;
  const { theme, toggleTheme } = useTheme();
  const [commanderView, setCommanderView] = useState<'dashboard' | 'home' | 'logs' | 'teams' | 'disasters'>(() => {
    try {
      if (typeof window === 'undefined') return 'dashboard';
      const params = new URLSearchParams(window.location.search);
      const v = params.get('commanderView');
      if (v === 'disasters') return 'disasters';
      if (v === 'home') return 'home';
      if (v === 'logs') return 'logs';
      if (v === 'teams') return 'teams';
      return 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // keep URL in sync so views are bookmarkable and respond to back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('commanderView', commanderView);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [commanderView]);

  // update state when user navigates with back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('commanderView');
      if (v === 'home') setCommanderView('home');
      else if (v === 'logs') setCommanderView('logs');
      else if (v === 'disasters') setCommanderView('disasters');
      else if (v === 'teams') setCommanderView('teams');
      else setCommanderView('dashboard');
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const renderContent = () => {
    if (activeRole === 'commander') {
      if (commanderView === 'disasters') return <CommanderDisasters />;
      if (commanderView === 'home') return <CommanderHome />;
      if (commanderView === 'logs') return <CommanderLogs />;
      if (commanderView === 'teams') return <CommanderTeams />;
      return <ActiveDashboard user={user} />;
    }

    return <ActiveDashboard user={user} />;
  };

  return (
    <div className="dashboard-shell">
      <header className="app-nav" role="banner">
        <div className="app-nav__brand">
          <img src="/logo/logo.png" alt="Roshni logo" className="app-nav__logo" />
          <span className="app-nav__title">ROSHNI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeRole === 'commander' && (
            <nav className="app-nav__links" aria-label="Commander links">
              <button
                type="button"
                className={`app-nav__link ${commanderView === 'home' ? 'active' : ''}`}
                onClick={() => setCommanderView('home')}
              >
                Home
              </button>
              <button
                type="button"
                className={`app-nav__link ${commanderView === 'disasters' ? 'active' : ''}`}
                onClick={() => setCommanderView('disasters')}
              >
                Disasters
              </button>
              <button
                type="button"
                className={`app-nav__link ${commanderView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCommanderView('dashboard')}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={`app-nav__link ${commanderView === 'teams' ? 'active' : ''}`}
                onClick={() => setCommanderView('teams')}
              >
                Teams
              </button>
              <button
                type="button"
                className={`app-nav__link ${commanderView === 'logs' ? 'active' : ''}`}
                onClick={() => setCommanderView('logs')}
              >
                View Logs
              </button>
            </nav>
          )}

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

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
        </div>
      </header>

      <main className="dashboard-main" aria-label={`${activeRole} dashboard`}>
        {renderContent()}
      </main>
    </div>
  );
};


function App({ onBeginLogin = redirectTo }: AppProps = {}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    // If URL has '?code=' or '?session=', it means we just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('session')) {
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Session will be loaded by the main useEffect below
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.session, {
          credentials: 'include',
          signal: controller.signal,
        });

        // 401 is expected when not authenticated - not an error
        if (response.status === 401) {
          if (isMounted) {
            setUser(null);
            setError(null);
            setCheckingSession(false);
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Unable to fetch session');
        }

        const currentUser = (await response.json()) as SessionUser;
        if (isMounted) {
          setUser(currentUser);
          setError(null);
          // Check if user needs to complete registration
          if (!currentUser.is_profile_complete) {
            setShowRegistration(true);
          }
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
      setShowRegistration(false);
    } catch {
      setError('Unable to contact the authentication service. Please retry.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRegistrationComplete = async (data: RegistrationData) => {
    try {
      // Step 1: Complete onboarding with phone and DOB (required for is_profile_complete)
      const onboardingResponse = await fetch(API_ENDPOINTS.completeRegistration, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          phone_number: data.phoneNumber,
          date_of_birth: data.dateOfBirth,
        }),
      });

      if (!onboardingResponse.ok) {
        const errorData = await onboardingResponse.json();
        throw new Error(errorData.detail || 'Failed to complete onboarding');
      }

      // Step 2: Update general profile (name, address, emergency contacts)
      const profileResponse = await fetch(API_ENDPOINTS.updateProfile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: data.fullName,
          address: data.address || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
        }),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      // Step 3: Update medical info if provided
      if (data.medicalInfo) {
        const medicalResponse = await fetch(API_ENDPOINTS.updateMedical, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            other_medical_notes: data.medicalInfo,
          }),
        });

        if (!medicalResponse.ok) {
          const errorData = await medicalResponse.json();
          throw new Error(errorData.detail || 'Failed to update medical info');
        }
      }

      // Step 4: Reload session to get updated user data with is_profile_complete = true
      const sessionResponse = await fetch(API_ENDPOINTS.session, {
        credentials: 'include',
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to reload session');
      }

      const updatedUser = (await sessionResponse.json()) as SessionUser;
      setUser(updatedUser);
      setShowRegistration(false);
      setError(null);
    } catch (err) {
      throw err; // Let the form handle the error display
    }
  };

  const handleRegistrationCancel = async () => {
    // Log out the user if they cancel registration
    await handleLogout();
  };

  // Show registration form if user needs to complete registration
  if (showRegistration && user) {
    return (
      <RegistrationForm
        email={user.email}
        onSubmit={handleRegistrationComplete}
        onCancel={handleRegistrationCancel}
      />
    );
  }

  if (user) {
    return (
      <ThemeProvider>
        <DashboardView user={user} onLogout={handleLogout} loggingOut={loggingOut} />
      </ThemeProvider>
    );
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
