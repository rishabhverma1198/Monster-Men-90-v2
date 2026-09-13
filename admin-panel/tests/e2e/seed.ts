import type { APIRequestContext } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

const BACKEND_BASE_URL =
  process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:5000';

type LoginResponse =
  | { success: true; data: { token: string } }
  | { success: false; message?: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonWithRetry<T>(
  request: APIRequestContext,
  method: 'get' | 'post',
  url: string,
  opts: Parameters<APIRequestContext['get']>[1] | Parameters<APIRequestContext['post']>[1],
  retries = 4
): Promise<{ status: number; body: T }> {
  // Playwright APIRequestContext doesn't share a common signature for get/post options,
  // but both accept { headers, data, params } etc. We keep it simple and retry 429/503.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn: any = (request as any)[method].bind(request);

  let lastStatus = 0;
  let lastText = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fn(url, opts);
    lastStatus = resp.status();

    if (lastStatus === 429 || lastStatus === 503) {
      await sleep(500 * (attempt + 1));
      continue;
    }

    try {
      const body = (await resp.json()) as T;
      return { status: lastStatus, body };
    } catch {
      lastText = await resp.text();
      break;
    }
  }

  throw new Error(
    `API request failed: ${method.toUpperCase()} ${url} (status ${lastStatus}) ${lastText}`
  );
}

export async function getAdminToken(request: APIRequestContext): Promise<string> {
  const { status, body } = await jsonWithRetry<LoginResponse>(
    request,
    'post',
    `${BACKEND_BASE_URL}/api/auth/login`,
    {
      headers: { 'x-e2e-test': '1' },
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    }
  );

  if (status !== 200 || !body || (body as any).success !== true) {
    throw new Error(
      `Admin login failed (status ${status}): ${(body as any)?.message || 'unknown error'}`
    );
  }

  const token = (body as any).data?.token as string | undefined;
  if (!token) throw new Error('Admin login response missing token');
  return token;
}

async function getAnyExistingProductId(
  request: APIRequestContext,
  adminToken: string
): Promise<string | null> {
  const { status, body } = await jsonWithRetry<any>(
    request,
    'get',
    `${BACKEND_BASE_URL}/api/admin/products?limit=1&offset=0`,
    {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-e2e-test': '1' },
    }
  );

  if (status !== 200 || !body?.data?.products) return null;
  const first = body.data.products?.[0];
  return first?.id ?? null;
}

export async function ensureAdminProductExists(
  request: APIRequestContext
): Promise<string> {
  const adminToken = await getAdminToken(request);

  const existing = await getAnyExistingProductId(request, adminToken);
  if (existing) return existing;

  const seedName = `E2E Seed Product ${Date.now()}`;
  const { status, body } = await jsonWithRetry<any>(
    request,
    'post',
    `${BACKEND_BASE_URL}/api/admin/products`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'x-e2e-test': '1',
      },
      data: {
        name: seedName,
        description: 'Seed product created by Playwright to unblock E2E tests.',
        price: 999,
        stock: 50,
        category: 'Men',
        gender: 'men',
        image_url: '',
      },
    }
  );

  if (status !== 201 || !body?.data?.id) {
    throw new Error(
      `Failed to create seed product (status ${status}): ${JSON.stringify(body)}`
    );
  }

  return body.data.id as string;
}

async function getAdminOrdersCount(
  request: APIRequestContext,
  adminToken: string
): Promise<number> {
  const { status, body } = await jsonWithRetry<any>(
    request,
    'get',
    `${BACKEND_BASE_URL}/api/admin/orders?limit=1&offset=0`,
    {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-e2e-test': '1' },
    }
  );

  if (status !== 200) return 0;
  const total = body?.data?.total;
  return typeof total === 'number' ? total : 0;
}

async function addToCart(
  request: APIRequestContext,
  userToken: string,
  productId: string
) {
  const { status, body } = await jsonWithRetry<any>(
    request,
    'post',
    `${BACKEND_BASE_URL}/api/cart`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'x-e2e-test': '1',
      },
      data: { product_id: productId, quantity: 1 },
    }
  );

  if (status !== 200 || body?.success !== true) {
    throw new Error(
      `Add to cart failed (status ${status}): ${JSON.stringify(body)}`
    );
  }
}

async function createOrder(
  request: APIRequestContext,
  userToken: string,
  emailForUserDetails: string
) {
  const { status, body } = await jsonWithRetry<any>(
    request,
    'post',
    `${BACKEND_BASE_URL}/api/orders`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'x-e2e-test': '1',
      },
      data: {
        user_type: 'single',
        user_details: {
          name: 'E2E Buyer',
          email: emailForUserDetails,
          contact_number: '9876543210',
        },
      },
    }
  );

  if (status !== 201 || body?.success !== true) {
    throw new Error(
      `Create order failed (status ${status}): ${JSON.stringify(body)}`
    );
  }
}

export async function ensureAdminOrderExists(
  request: APIRequestContext
): Promise<void> {
  const adminToken = await getAdminToken(request);
  const totalOrders = await getAdminOrdersCount(request, adminToken);
  if (totalOrders > 0) return;

  const productId = await ensureAdminProductExists(request);

  // Create an order using the existing admin account.
  // This avoids Supabase email-confirmation settings blocking newly signed up users.
  await addToCart(request, adminToken, productId);
  await createOrder(request, adminToken, ADMIN_EMAIL);
}

