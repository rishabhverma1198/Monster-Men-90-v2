/**
 * OTP Backend Tests
 * 
 * Example test file demonstrating how to test OTP endpoints
 * Run with: npm test -- otp.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Response } from 'supertest';
import app, { appReady } from '../server.js';
import { supabaseAdmin } from '../config/supabase.js';

// Mock Supabase
vi.mock('../config/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('OTP Endpoints', () => {
  beforeAll(async () => {
    await appReady;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/otp/generate', () => {
    it('should generate OTP for valid admin phone', async () => {
      // Mock admin profile
      const mockProfile = {
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin',
        contact_number: '9876543210',
        otp_enabled: true,
        status: 'active',
      };

      let callCount = 0;
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: mockProfile,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'admin_otps') {
          callCount++;
          if (callCount === 1) {
            // First call: count recent OTPs
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gte: vi.fn().mockResolvedValue({
                      count: 0,
                    }),
                  })),
                })),
              })),
            };
          } else if (callCount === 2) {
            // Second call: update old OTPs
            return {
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({}),
                })),
              })),
            };
          } else if (callCount === 3) {
            // Third call: insert new OTP
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'otp-id',
                      phone_number: '9876543210',
                      otp_code: '123456',
                      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/generate')
        .send({ phone_number: '9876543210' })
        .expect(200));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expires_in', 300);
    });

    it('should reject if admin not found', async () => {
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Not found' },
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/generate')
        .send({ phone_number: '9876543210' })
        .expect(404));

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should reject if OTP disabled', async () => {
      const mockProfile = {
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin',
        phone_number: '9876543210',
        is_active: true,
      };
      let profilesCallCount = 0;
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          profilesCallCount++;
          if (profilesCallCount === 1) {
            // First call: find admin by phone_number, role, is_active
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: mockProfile,
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            };
          }
          if (profilesCallCount === 2) {
            // Second call: select otp_enabled by id
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { otp_enabled: false },
                    error: null,
                  }),
                })),
              })),
            };
          }
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/generate')
        .send({ phone_number: '9876543210' })
        .expect(403));

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/OTP login is not enabled/i);
    });
  });

  describe('POST /api/otp/verify', () => {
    it('should verify valid OTP and return token', async () => {
      const mockOTP = {
        id: 'otp-id',
        phone_number: '9876543210',
        otp_code: '123456',
        user_id: 'admin-id',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attempts: 0,
        max_attempts: 3,
        is_used: false,
      };

      const mockProfile = {
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin',
        status: 'active',
      };

      let otpCallCount = 0;
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'admin_otps') {
          otpCallCount++;
          if (otpCallCount === 1) {
            // First call: select OTP
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(() => ({
                          single: vi.fn().mockResolvedValue({
                            data: mockOTP,
                            error: null,
                          }),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            };
          } else if (otpCallCount === 2) {
            // Second call: update OTP (mark as used)
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({}),
              })),
            };
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/verify')
        .send({ phone_number: '9876543210', otp_code: '123456' })
        .expect(200));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject expired OTP', async () => {
      const expiredOTP = {
        id: 'otp-id',
        phone_number: '9876543210',
        otp_code: '123456',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        is_used: false,
      };

      let otpCallCount = 0;
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'admin_otps') {
          otpCallCount++;
          if (otpCallCount === 1) {
            // First call: select expired OTP
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(() => ({
                          single: vi.fn().mockResolvedValue({
                            data: expiredOTP,
                            error: null,
                          }),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            };
          } else if (otpCallCount === 2) {
            // Second call: update OTP (mark as used)
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({}),
              })),
            };
          }
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/verify')
        .send({ phone_number: '9876543210', otp_code: '123456' })
        .expect(401));

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should reject invalid OTP code', async () => {
      let otpCallCount = 0;
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'admin_otps') {
          otpCallCount++;
          if (otpCallCount === 1) {
            // First call: select OTP (wrong code, so no match)
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(() => ({
                          single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' },
                          }),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            };
          }
        }
        return {
          select: vi.fn(),
          update: vi.fn(),
          insert: vi.fn(),
        };
      });

      const response = await ((request(app) as any)
        .post('/api/otp/verify')
        .send({ phone_number: '9876543210', otp_code: '000000' })
        .expect(401));

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OTP');
    });
  });
});
