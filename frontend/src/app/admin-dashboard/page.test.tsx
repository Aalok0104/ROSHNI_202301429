import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AdminDashboard from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('Admin Dashboard', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  it('renders admin dashboard with commander greeting', async () => {
    const mockUser = {
      email: 'commander@example.com',
      name: 'Commander User',
      role: 'commander',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, Commander')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('redirects to user dashboard when user is not commander', async () => {
    const mockUser = {
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user-dashboard');
    });
  });

  it('redirects to login when no user session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to login when session check fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles logout successfully', async () => {
    const mockUser = {
      email: 'commander@example.com',
      name: 'Commander User',
      role: 'commander',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Logged out' }),
      });

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, Commander')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles logout error gracefully', async () => {
    const mockUser = {
      email: 'commander@example.com',
      name: 'Commander User',
      role: 'commander',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      })
      .mockRejectedValueOnce(new Error('Logout failed'));

    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, Commander')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalledWith('/');
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AdminDashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
