import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import UserDashboard from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('User Dashboard', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  it('renders user dashboard with correct greeting for user role', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, User')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('renders user dashboard with correct greeting for responder role', async () => {
    const mockUser = {
      email: 'responder@example.com',
      name: 'Responder User',
      role: 'responder',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, Responder')).toBeInTheDocument();
    });
  });

  it('redirects to login when no user session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to login when session check fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles logout successfully', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
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

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, User')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles logout error gracefully', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      })
      .mockRejectedValueOnce(new Error('Logout failed'));

    render(<UserDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, User')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalledWith('/');
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<UserDashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
