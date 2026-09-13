/**
 * Auth routes tests (customer OTP, Google OAuth redirect URL accuracy)
 * Run: npm test -- auth.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app, { appReady } from '../server.js';

// Mock Supabase client and admin
const mockFrom = vi.fn();
const mockAuth = {
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};
const mockAuthAdmin = {
  admin: {
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  },
};

vi.mock('../config/supabase.js', () => ({
  supabase: {
    auth: mockAuth,
  },
  supabaseAdmin: {
    auth: mockAuthAdmin,
    from: (table: string) => mockFrom(table),
  },
}));

// Mock WhatsApp service
vi.mock('../services/whatsapp.service.js', () => ({
  generateCustomerOTPLink: vi.fn(() => 'https://wa.me/919876543210?text=OTP'),
}));

// Chain helpers for supabaseAdmin.from().select().eq()...
// Supports: select().eq().single(), select().eq().maybeSingle(), select().eq().eq().eq().order().limit().single()
function chainSelectSingle(result: { data: any; error: any }) {
  const single = vi.fn().mockResolvedValue(result);
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eqReturn = () => ({
    eq: vi.fn(() => eqReturn()),
    order: vi.fn(() => ({
      limit: vi.fn(() => ({ single })),
    })),
    limit: vi.fn(() => ({ single })),
    single,
    maybeSingle,
    gte: vi.fn().mockResolvedValue(result),
  });
  return {
    select: vi.fn(() => eqReturn()),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({}) })),
        mockResolvedValue: vi.fn().mockResolvedValue({}),
      })),
    })),
  };
}

function chainCount(count: number) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ count }),
        })),
      })),
    })),
  };
}

function chainUpdate() {
  return {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  };
}

function chainInsert() {
  return {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe('Auth Routes', () => {
  beforeAll(async () => {
    await appReady;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/otp/send', () => {
    it('should return 400 for phone with less than 10 digits after normalize', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_otps') {
          return chainCount(0);
        }
        return {};
      });

      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone_number: 'aaaaaaaaaa' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/10-digit|Valid/);
    });

    it('should return 429 when recent OTP exists (rate limit)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_otps') {
          return chainCount(1); // recent OTP count > 0
        }
        return {};
      });

      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone_number: '9876543210' })
        .expect(429);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/wait|OTP/);
    });

    it('should return 200 and whatsapp_url when OTP sent', async () => {
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_otps') {
          callCount++;
          if (callCount === 1) return chainCount(0);
          if (callCount === 2) return chainUpdate();
          if (callCount === 3) return chainInsert();
        }
        return {};
      });

      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone_number: '9876543210' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('whatsapp_url');
      expect(res.body.data.whatsapp_url).toMatch(/wa\.me/);
      expect(res.body.data.expires_in_seconds).toBe(300);
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    it('should return 400 for invalid or missing OTP', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_otps') {
          return chainSelectSingle({ data: null, error: { message: 'Not found' } });
        }
        return {};
      });

      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone_number: '9876543210', otp_code: '000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid|expired|OTP/);
    });

    it('should return 200 with user and token when OTP valid and profile exists', async () => {
      const mockProfile = {
        id: 'user-1',
        email: '9876543210@monstermen90.phone',
        phone_number: '9876543210',
        full_name: 'User 3210',
        role: 'buyer',
        is_active: true,
      };
      const mockOtpRow = {
        id: 'otp-1',
        phone_number: '9876543210',
        otp_code: '123456',
        is_used: false,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };

      let otpCalls = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_otps') {
          otpCalls++;
          if (otpCalls === 1) {
            return chainSelectSingle({ data: mockOtpRow, error: null });
          }
          return chainUpdate();
        }
        if (table === 'profiles') {
          return chainSelectSingle({ data: mockProfile, error: null });
        }
        return {};
      });

      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone_number: '9876543210', otp_code: '123456' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.role).toBe('buyer');
    });
  });

  describe('GET /api/auth/check', () => {
    it('should return 400 when identifier is missing', async () => {
      const res = await request(app).get('/api/auth/check').expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/identifier/);
    });

    it('should return exists true for existing email', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
              })),
            })),
          };
        }
        return {};
      });

      const res = await request(app)
        .get('/api/auth/check')
        .query({ identifier: 'user@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.exists).toBe(true);
      expect(res.body.data.type).toBe('email');
    });

    it('should return exists false for new email', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        return {};
      });

      const res = await request(app)
        .get('/api/auth/check')
        .query({ identifier: 'newuser@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.exists).toBe(false);
      expect(res.body.data.type).toBe('email');
    });

    it('should return exists true for existing phone', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-2' }, error: null }),
              })),
            })),
          };
        }
        return {};
      });

      const res = await request(app)
        .get('/api/auth/check')
        .query({ identifier: '9876543210' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.exists).toBe(true);
      expect(res.body.data.type).toBe('phone');
    });

    it('should return 400 for invalid phone (too short)', async () => {
      const res = await request(app)
        .get('/api/auth/check')
        .query({ identifier: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Valid|10-digit/);
    });
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth URL with backend callback in redirectTo', async () => {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      mockAuth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...' },
        error: null,
      });

      await request(app)
        .get('/api/auth/google')
        .query({ redirect_url: 'http://localhost:5173/auth/callback' })
        .expect(302)
        .expect((res) => {
          expect(mockAuth.signInWithOAuth).toHaveBeenCalled();
          const opts = mockAuth.signInWithOAuth.mock.calls[0][0].options;
          expect(opts.redirectTo).toContain(backendUrl);
          expect(opts.redirectTo).toContain('/api/auth/google/callback');
          expect(opts.redirectTo).toContain('redirect_url');
        });
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should redirect to frontend /login on OAuth error', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback')
        .query({
          error: 'access_denied',
          redirect_url: 'http://localhost:5173/auth/callback',
        })
        .expect(302);

      expect(res.headers.location).toMatch(/^http:\/\/localhost:5173\/login\?error=/);
      expect(res.headers.location).not.toMatch(/\/auth\/callback\/login/);
    });

    it('should redirect to frontend callback URL without double /auth/callback when redirect_url is full callback URL', async () => {
      const mockUser = {
        id: 'google-user-1',
        email: 'user@gmail.com',
        user_metadata: { full_name: 'Test User', picture: null },
      };
      const mockProfile = {
        id: 'google-user-1',
        email: 'user@gmail.com',
        full_name: 'Test User',
        role: 'buyer',
        is_active: true,
      };

      mockAuth.exchangeCodeForSession.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return chainSelectSingle({ data: mockProfile, error: null });
        }
        return {};
      });

      const redirectUrl = 'http://localhost:5173/auth/callback';
      const res = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'mock-code', redirect_url: redirectUrl })
        .expect(302);

      const location = res.headers.location;
      expect(location).toMatch(/^http:\/\/localhost:5173\/auth\/callback\?/);
      expect(location).not.toMatch(/\/auth\/callback\/auth\/callback/);
      expect(location).toContain('token=');
      expect(location).toContain('user=');
    });

    it('should redirect to frontend origin /login when redirect_url is full callback URL and code missing', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback')
        .query({ redirect_url: 'http://localhost:5173/auth/callback' })
        .expect(302);

      expect(res.headers.location).toMatch(/^http:\/\/localhost:5173\/login\?error=/);
    });
  });
});
