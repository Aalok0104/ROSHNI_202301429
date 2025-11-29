import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock commander modal components with simple interactive wrappers so we can
// trigger callbacks passed by the component under test.
vi.mock('../components/commander/DeclareEmergencyModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'declare-modal' }, 
      React.createElement('button', { onClick: () => props.onCreated && props.onCreated({ incident_id: 'new-i' }) }, 'Create'),
      React.createElement('button', { onClick: () => props.onCreated && props.onCreated(null) }, 'NoCreate')
    ),
  };
});
vi.mock('../components/commander/DisasterDetailModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'detail-modal' }, 
      React.createElement('button', { onClick: () => props.onDiscard && props.onDiscard(props.incident?.incident_id) }, 'Discard'),
      React.createElement('button', { onClick: () => props.onConvert && props.onConvert(props.incident?.incident_id) }, 'Convert')
    ),
  };
});
vi.mock('../components/commander/EditIncidentModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'edit-modal' }, 
      React.createElement('button', { onClick: () => props.onSave && props.onSave(props.incident?.incident_id, { title: 'Updated Title' }) }, 'Save'),
      React.createElement('button', { onClick: () => props.onDiscard && props.onDiscard(props.incident?.incident_id) }, 'Discard')
    ),
  };
});
vi.mock('../components/commander/ConvertToDisasterModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'convert-modal' }, React.createElement('button', { onClick: () => props.onConverted && props.onConverted({ disaster_id: 'new-d', title: 'Converted' }) }, 'Convert')),
  };
});
vi.mock('../components/commander/ConfirmModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'confirm-modal' }, 
      React.createElement('button', { onClick: () => props.onConfirm && props.onConfirm() }, 'Confirm'),
      React.createElement('button', { onClick: () => props.onCancel && props.onCancel() }, 'Cancel')
    ),
  };
});
vi.mock('../components/commander/GenerateReportModal', () => {
  const React = require('react');
  return {
    default: (props: any) => React.createElement('div', { 'data-testid': 'generate-modal' }, React.createElement('button', { onClick: () => props.onGenerated && props.onGenerated({ report_id: 'r-new' }) }, 'Generate')),
  };
});

import CommanderDisasters from '../dashboards/CommanderDisasters';

// Simple endpoint-aware fetch mock for incidents and disasters
const mockFetchFor = (map: Record<string, any>) =>
  vi.fn().mockImplementation((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;

    if (url.endsWith('/incidents')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.incidents || []) } as unknown as Response);
    }

    if (url.endsWith('/disasters')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(map.disasters || []) } as unknown as Response);
    }

    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
  });

describe('CommanderDisasters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clear cookie used by the component
    try {
      document.cookie = 'commander_disaster_id=; Max-Age=0; path=/';
    } catch (e) {
      // ignore
    }
  });

  it('renders header and shows empty messages when no incidents or disasters', async () => {
    global.fetch = mockFetchFor({ incidents: [], disasters: [] }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole('heading', { name: /disasters/i })).toBeInTheDocument();
    expect(await screen.findByText(/No reported incidents at the moment\./i)).toBeInTheDocument();
    expect(await screen.findByText(/No active disasters\./i)).toBeInTheDocument();
  });

  it('renders incidents and reported disasters and respects active-disaster cookie and opens declare modal', async () => {
    const incidents = [
      { incident_id: 'i1', title: 'Broken transformer', incident_type: 'power', description: 'Downed line', status: 'reported' },
    ];
    const disasters = [
      { disaster_id: 'd1', title: 'Major Outage', severity_level: 'High', description: 'Widespread power loss' },
    ];

    // set cookie to simulate commander already having an active disaster
    try {
      document.cookie = 'commander_disaster_id=active123; path=/';
    } catch (e) {
      // ignore
    }

    global.fetch = mockFetchFor({ incidents, disasters }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    // incident and disaster titles should appear
    expect(await screen.findByText(/Broken transformer/i)).toBeInTheDocument();
    expect(await screen.findByText(/Major Outage/i)).toBeInTheDocument();

    // Convert button should be disabled because cookie indicates active disaster
    const convertButtons = await screen.findAllByText(/Convert to Disaster/i);
    expect(convertButtons.length).toBeGreaterThanOrEqual(1);
    expect(convertButtons[0]).toBeDisabled();

    // Click Declare Civilian Emergency to open the declare modal (mocked)
    const declareBtn = await screen.findByRole('button', { name: /Declare Civilian Emergency/i });
    fireEvent.click(declareBtn);
    expect(await screen.findByTestId('declare-modal')).toBeInTheDocument();
  });

  it('discard from detail modal removes the incident', async () => {
    const incidents = [
      { incident_id: 'i1', title: 'To be discarded', incident_type: 'power', description: 'Downed line', status: 'reported' },
      { incident_id: 'i2', title: 'Keep me', incident_type: 'fire', description: 'Small fire', status: 'reported' },
    ];

    global.fetch = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = (init && init.method) || 'GET';

      if (url.endsWith('/incidents') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(incidents) } as unknown as Response);
      }

      if (url.match(/\/incidents\/i1\/status$/) && method === 'PATCH') {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') } as unknown as Response);
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
    }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    // open detail by clicking the incident-left area; the component renders the title
    expect(await screen.findByText(/To be discarded/i)).toBeInTheDocument();
    const viewButtons = await screen.findAllByText(/View/i);
    fireEvent.click(viewButtons[0]);

    // detail modal mocked: click Discard
    expect(await screen.findByTestId('detail-modal')).toBeInTheDocument();
    const discardBtn = await screen.findByText('Discard');
    fireEvent.click(discardBtn);

    // The discarded incident should be removed from the DOM after async update
    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      expect(screen.queryByText(/To be discarded/i)).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Keep me/i)).toBeInTheDocument();
  });

  it('declare modal NoCreate triggers re-fetch of incidents', async () => {
    // fetch will be called for initial incidents + disasters and then again when NoCreate triggers fetchIncidents
    const incidents: any[] = [];
    const disasters: any[] = [];

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/incidents')) return Promise.resolve({ ok: true, json: () => Promise.resolve(incidents) } as unknown as Response);
      if (url.endsWith('/disasters')) return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      return Promise.resolve({ ok: false } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    // open declare modal
    const declareBtn = await screen.findByRole('button', { name: /Declare Civilian Emergency/i });
    fireEvent.click(declareBtn);

    // click NoCreate to trigger onCreated(null) -> component should re-fetch incidents
    expect(await screen.findByTestId('declare-modal')).toBeInTheDocument();
    const noCreate = await screen.findByText('NoCreate');
    fireEvent.click(noCreate);

    // fetch should have been called at least twice (initial + re-fetch)
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('convert from detail alerts when commander already has active disaster', async () => {
    const incidents = [ { incident_id: 'z1', title: 'Z', incident_type: 'power' } ];
    const disasters: any[] = [];

    document.cookie = 'commander_disaster_id=already; path=/';

    global.fetch = mockFetchFor({ incidents, disasters }) as unknown as typeof fetch;

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    // open detail via View button
    expect(await screen.findByText(/Z/)).toBeInTheDocument();
    const view = await screen.findByText('View');
    fireEvent.click(view);

    expect(await screen.findByTestId('detail-modal')).toBeInTheDocument();
    const convertBtn = await screen.findByText('Convert');
    fireEvent.click(convertBtn);

    expect(alertSpy).toHaveBeenCalledWith('You already have an active disaster. End it before converting another incident.');
    alertSpy.mockRestore();
  });

  it('end disaster confirm failure alerts and does not show generate modal', async () => {
    const disasters = [ { disaster_id: 'd-fail', title: 'Failing Disaster', severity_level: 'low' } ];
    // set cookie to indicate active disaster
    document.cookie = 'commander_disaster_id=d-fail; path=/';

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/disasters')) return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      if (url.match(/\/disasters\/d-fail\/close$/)) return Promise.resolve({ ok: false, text: () => Promise.resolve('close-failed') } as unknown as Response);
      return Promise.resolve({ ok: false } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/Failing Disaster/i)).toBeInTheDocument();
    const endBtn = await screen.findByText(/End Disaster/i);
    fireEvent.click(endBtn);

    expect(await screen.findByTestId('confirm-modal')).toBeInTheDocument();
    const confirm = await screen.findByText('Confirm');
    fireEvent.click(confirm);

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    // generate modal should not appear
    expect(screen.queryByTestId('generate-modal')).toBeNull();
    alertSpy.mockRestore();
  });

  it('save incident failure shows alert', async () => {
    const incidents = [ { incident_id: 'i-save', title: 'To Save', incident_type: 'power' } ];

    global.fetch = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = (init && init.method) || 'GET';
      if (url.endsWith('/incidents') && method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve(incidents) } as unknown as Response);
      if (url.match(/\/incidents\/i-save$/) && method === 'PATCH') return Promise.resolve({ ok: false, text: () => Promise.resolve('bad') } as unknown as Response);
      return Promise.resolve({ ok: false } as unknown as Response);
    }) as unknown as typeof fetch;

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/To Save/i)).toBeInTheDocument();
    const edit = await screen.findByText('Edit');
    fireEvent.click(edit);

    expect(await screen.findByTestId('edit-modal')).toBeInTheDocument();
    const save = await screen.findByText('Save');
    fireEvent.click(save);

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });

  it('generate report click calls handler and alerts', async () => {
    const disasters = [ { disaster_id: 'd10', title: 'Closable', severity_level: 'low' } ];

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/disasters')) return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      if (url.match(/\/disasters\/d10\/close$/)) return Promise.resolve({ ok: true, text: () => Promise.resolve('ok') } as unknown as Response);
      return Promise.resolve({ ok: false } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/Closable/i)).toBeInTheDocument();
    const endBtn = await screen.findByText(/End Disaster/i);
    fireEvent.click(endBtn);

    expect(await screen.findByTestId('confirm-modal')).toBeInTheDocument();
    const confirm = await screen.findByText('Confirm');
    fireEvent.click(confirm);

    // generate modal appears
    expect(await screen.findByTestId('generate-modal')).toBeInTheDocument();
    const gen = await screen.findByText('Generate');
    fireEvent.click(gen);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Report draft created'));
    alertSpy.mockRestore();
  });

  it('save via edit modal updates an incident title', async () => {
    const incidents = [
      { incident_id: 'i3', title: 'Old Title', incident_type: 'power', description: 'old', status: 'reported' },
    ];

    global.fetch = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = (init && init.method) || 'GET';

      if (url.endsWith('/incidents') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(incidents) } as unknown as Response);
      }

      if (url.match(/\/incidents\/i3$/) && method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...incidents[0], title: 'Updated Title' }) } as unknown as Response);
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
    }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/Old Title/i)).toBeInTheDocument();
    const editButtons = await screen.findAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);

    // edit modal mocked: click Save which calls onSave and triggers PATCH
    expect(await screen.findByTestId('edit-modal')).toBeInTheDocument();
    const saveBtn = await screen.findByText('Save');
    fireEvent.click(saveBtn);

    // updated title should appear
    expect(await screen.findByText(/Updated Title/i)).toBeInTheDocument();
  });

  it('convert to disaster moves incident to reported and sets session cookie', async () => {
    const incidents = [
      { incident_id: 'i4', title: 'To Convert', incident_type: 'power', description: 'desc', status: 'reported' },
    ];
    const disasters: any[] = [];

    global.fetch = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = (init && init.method) || 'GET';

      if (url.endsWith('/incidents') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(incidents) } as unknown as Response);
      }

      if (url.endsWith('/disasters') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
    }) as unknown as typeof fetch;

    // ensure no cookie initially
    document.cookie = 'commander_disaster_id=; Max-Age=0; path=/';

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/To Convert/i)).toBeInTheDocument();
    const convertBtn = await screen.findByText(/Convert to Disaster/i);
    fireEvent.click(convertBtn);

    // convert modal mock will call onConverted immediately when its Convert button is clicked
    expect(await screen.findByTestId('convert-modal')).toBeInTheDocument();
    const modalConvert = await screen.findByText('Convert');
    fireEvent.click(modalConvert);

    // reported disaster title should appear and cookie should be set
    expect(await screen.findByText(/Converted/i)).toBeInTheDocument();
    expect(document.cookie.includes('commander_disaster_id=new-d')).toBeTruthy();
  });

  it('end disaster confirm flow shows generate modal and clears cookie', async () => {
    const disasters = [
      { disaster_id: 'd9', title: 'Closing Disaster', severity_level: 'Low' },
    ];

    // set cookie to indicate active
    document.cookie = 'commander_disaster_id=d9; path=/';

    global.fetch = vi.fn().mockImplementation((input: RequestInfo, init?: any) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = (init && init.method) || 'GET';

      if (url.endsWith('/disasters') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(disasters) } as unknown as Response);
      }

      if (url.match(/\/disasters\/d9\/close$/) && method === 'PATCH') {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('closed') } as unknown as Response);
      }

      // after close, refreshDisasters will request disasters; return empty
      if (url.endsWith('/disasters') && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as unknown as Response);
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as unknown as Response);
    }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByText(/Closing Disaster/i)).toBeInTheDocument();
    const endBtn = await screen.findByText(/End Disaster/i);
    fireEvent.click(endBtn);

    // confirm modal appears and its Confirm button will call onConfirm
    expect(await screen.findByTestId('confirm-modal')).toBeInTheDocument();
    const confirmBtn = await screen.findByText('Confirm');
    fireEvent.click(confirmBtn);

    // generate modal should now appear and cookie removed
    expect(await screen.findByTestId('generate-modal')).toBeInTheDocument();
    expect(document.cookie.includes('commander_disaster_id')).toBeFalsy();
  });

  it('renders severity dots for different levels', async () => {
    const disasters = [
      { disaster_id: 's1', title: 'C1', severity_level: 'critical' },
      { disaster_id: 's2', title: 'H1', severity_level: 'high' },
      { disaster_id: 's3', title: 'M1', severity_level: 'medium' },
      { disaster_id: 's4', title: 'L1', severity_level: 'low' },
    ];

    global.fetch = mockFetchFor({ incidents: [], disasters }) as unknown as typeof fetch;

    render(
      <ThemeProvider>
        <CommanderDisasters user={{ user_id: 'u1' } as any} />
      </ThemeProvider>,
    );

    expect(await screen.findByTitle('Critical Severity')).toBeInTheDocument();
    expect(await screen.findByTitle('High Severity')).toBeInTheDocument();
    expect(await screen.findByTitle('Medium Severity')).toBeInTheDocument();
    expect(await screen.findByTitle('Low Severity')).toBeInTheDocument();
  });
});
