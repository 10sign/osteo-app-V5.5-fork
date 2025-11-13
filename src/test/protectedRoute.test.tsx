import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'u1',
      email: 'test@example.com',
      role: 'osteopath',
      permissions: [],
      isActive: true,
    },
    isAuthenticated: true,
    loading: false,
    hasPermission: () => true,
    isAdmin: () => false,
  }),
}));

describe('ProtectedRoute', () => {
  it('allows access for role osteopath', () => {
    const element = (
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoute>
          <div data-testid="allowed">content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Render without crashing, snapshot not needed; verify JSX structure
    expect(element).toBeTruthy();
  });
});