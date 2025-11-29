import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommanderHome from '../dashboards/CommanderHome';
import { ThemeProvider } from '../contexts/ThemeContext';

const mockFetchFor = (map: Record<string, any>) =>
  vi.fn().mockImplementation((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;

    // Prefer specific matches so we don't accidentally return the wrong payload
    if (url.includes('/reports/disasters/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.reports || []) } as unknown as Response);
    }

    if (url.match(/\/disasters\/[^/]+\/stats$/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.stats || null) } as unknown as Response);
    }

    if (url.endsWith('/disasters')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.disasters || []) } as unknown as Response);
    }

    if (url.includes('/commander/teams')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.units || []) } as unknown as Response);
    }

    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
  });

describe('CommanderHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header and shows no reports when none are returned', async () => {
    const disasters = [{ disaster_id: 'd1', title: 'Fire in Sector 1', severity_level: 'High' }];
    const units = [{ team_id: 't1', name: 'Alpha', status: 'available' }];
    const stats = { affected_population_count: 1234, personnel_deployed: 10 };
    const reports: any[] = [];

    global.fetch = mockFetchFor({ disasters, units, stats, reports }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderHome />
      </ThemeProvider>,
    );

    expect(await screen.findByRole('heading', { name: /commander home/i })).toBeInTheDocument();
    expect(await screen.findByText(/Hazard Metrics/i)).toBeInTheDocument();
    expect(await screen.findByText(/High/)).toBeInTheDocument();
    expect(await screen.findByText(/No reports available for this disaster/i)).toBeInTheDocument();
  });

  it('renders report items and recent activity when reports exist', async () => {
    const now = new Date().toISOString();
    const disasters = [{ disaster_id: 'd2', title: 'Flood', severity_level: 'Medium' }];
    const units: any[] = [];
    const stats = { affected_population_count: 2000, personnel_deployed: 5 };
    const reports = [
      { report_id: 'r1', version_number: 1, generated_at: now, status: 'Published' },
      { report_id: 'r2', version_number: 2, generated_at: now, status: 'Draft' },
    ];

    global.fetch = mockFetchFor({ disasters, units, stats, reports }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderHome />
      </ThemeProvider>,
    );

    // heading
    expect(await screen.findByRole('heading', { name: /commander home/i })).toBeInTheDocument();

    // reports rendered (there may be multiple matches: report list + recent activity)
    const foundV1 = await screen.findAllByText(/Report v1/);
    expect(foundV1.length).toBeGreaterThanOrEqual(1);
    const foundV2 = await screen.findAllByText(/Report v2/);
    expect(foundV2.length).toBeGreaterThanOrEqual(1);
  });

  it('handles non-ok disasters fetch and shows empty metrics and no reports', async () => {
    // simulate disasters endpoint returning non-ok
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/disasters')) return Promise.resolve({ ok: false } as unknown as Response);
      if (url.includes('/commander/teams')) return Promise.resolve({ ok: false } as unknown as Response);
      return Promise.resolve({ ok: false } as unknown as Response);
    }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderHome />
      </ThemeProvider>,
    );

    expect(await screen.findByRole('heading', { name: /commander home/i })).toBeInTheDocument();
    // no selected disaster means placeholders
    expect(await screen.findByText(/No reports available for this disaster/i)).toBeInTheDocument();
    expect(await screen.findByText(/No recent activity/i)).toBeInTheDocument();
  });

  it('renders status pill class correctly when status contains spaces', async () => {
    const now = new Date().toISOString();
    const disasters = [{ disaster_id: 'd10', title: 'Spacey', severity_level: 'Low' }];
    const units: any[] = [];
    const stats = { affected_population_count: 10, personnel_deployed: 1 };
    const reports = [
      { report_id: 'r-space', version_number: 1, generated_at: now, status: 'In Review' },
    ];

    global.fetch = mockFetchFor({ disasters, units, stats, reports }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderHome />
      </ThemeProvider>,
    );

    // There may be multiple elements containing the same status text (time label and pill).
    // Find all matches and pick the one that is the status pill (has class 'status-pill').
    const statusMatches = await screen.findAllByText(/In Review/);
    const pill = statusMatches.find((el) => el.classList && el.classList.contains('status-pill')) || statusMatches.find((el) => el.closest && el.closest('.status-pill'));
    expect(pill).toBeTruthy();
    expect(pill as HTMLElement).toHaveClass('in-review');
  });

  it('changes selected disaster and fetches corresponding reports', async () => {
    const now = new Date().toISOString();
    const disasters = [
      { disaster_id: 'da', title: 'A', severity_level: 'Low' },
      { disaster_id: 'db', title: 'B', severity_level: 'High' },
    ];

    const units: any[] = [];

    // create a fetch mock that returns different reports depending on selected id
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/disasters')) return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      if (url.includes('/commander/teams')) return Promise.resolve({ ok: true, json: () => Promise.resolve(units) } as unknown as Response);
      if (url.includes('/disasters/da/stats')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ affected_population_count: 1 }) } as unknown as Response);
      if (url.includes('/reports/disasters/da/reports')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ report_id: 'r-a', version_number: 1, generated_at: now, status: 'OK' }]) } as unknown as Response);
      if (url.includes('/disasters/db/stats')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ affected_population_count: 2 }) } as unknown as Response);
      if (url.includes('/reports/disasters/db/reports')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ report_id: 'r-b', version_number: 1, generated_at: now, status: 'OK' }]) } as unknown as Response);
      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
    }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderHome />
      </ThemeProvider>,
    );

    // initial should request reports for disaster A
    await waitFor(() => {
      const calledA = (global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes('/reports/disasters/da/reports'));
      expect(calledA).toBeTruthy();
    });

    // change select to B
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'db' } });

    // now the component should request reports for disaster B
    await waitFor(() => {
      const calledB = (global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes('/reports/disasters/db/reports'));
      expect(calledB).toBeTruthy();
    });
  });
});
