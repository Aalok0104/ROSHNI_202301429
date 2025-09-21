import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Home from './page';

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

describe('Login Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  it('renders login page with logo and Google sign-in button', async () => {
    // Mock session check returning no user
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('redirects to user dashboard when user is already logged in', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<Home />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user-dashboard');
    });
  });

  it('redirects to admin dashboard when commander is already logged in', async () => {
    const mockUser = {
      email: 'commander@example.com',
      name: 'Commander User',
      role: 'commander',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    render(<Home />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin-dashboard');
    });
  });

  it('renders Google sign-in button', async () => {
    // Mock session check returning no user
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    const signInButton = screen.getByText('Sign in with Google');
    expect(signInButton).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Mock session check that never resolves
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<Home />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles session check error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });
  });
});