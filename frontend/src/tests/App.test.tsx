import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';

/**
 * Test helpers: create a fetch mock that returns safe defaults for the
 * endpoints the app and its children call. This prevents unhandled fetch
 * errors from child components (e.g. ReportsList) when asserting top-level
 * behaviour.
 */
const makeBackendMock = (overrides: { session?: any; profile?: any; incidents?: any[] } = {}) =>
  vi.fn().mockImplementation((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;

    if (url.includes('/auth/me')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.session ?? null) } as unknown as Response);
    }

    if (url.includes('/users/me/profile')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.profile ?? null) } as unknown as Response);
    }

    if (url.includes('/incidents') || url.includes('/reports') || url.includes('/disasters') || url.includes('/commander/teams')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.incidents ?? []) } as unknown as Response);
    }

    // default fallback
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
  });

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login split layout and calls onBeginLogin when user clicks Google', async () => {
    // Simulate unauthenticated (401) from session endpoint
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve(null) } as unknown as Response) as unknown as typeof fetch;

    const beginLogin = vi.fn();
    const u = userEvent.setup();
    render(<App onBeginLogin={beginLogin} />);

    expect(await screen.findByAltText(/roshni logo/i)).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();

    const loginButton = await screen.findByRole('button', { name: /continue with google/i });
    await u.click(loginButton);

    expect(beginLogin).toHaveBeenCalledTimes(1);
    expect(beginLogin.mock.calls[0][0]).toContain('/auth/login');
  });

  it('renders signed-in dashboard when session and profile exist', async () => {
    const session = { user_id: 'u1', email: 'civ@example.com', role: 'civilian', is_profile_complete: true };
    const profile = { full_name: 'Civic Test' };

    global.fetch = makeBackendMock({ session, profile, incidents: [] }) as unknown as typeof fetch;

    render(<App />);

    // Signed-in UI elements
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(await screen.findByText(/Civic Test/i)).toBeInTheDocument();
    expect(await screen.findByRole('main', { name: /civilian dashboard/i })).toBeInTheDocument();
  });

  it('shows an error message when session fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Unable to reach the authentication service/i)).toBeInTheDocument());
  });
});

