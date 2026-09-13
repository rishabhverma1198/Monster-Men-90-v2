/**
 * Nimbuspost Automated Testing
 * Complete test suite for all shipping endpoints.
 * Skips when NIMBUSPOST_API_KEY is not set (external API).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const NIMBUSPOST_API_KEY = process.env.NIMBUSPOST_API_KEY || '';
const NIMBUSPOST_BASE_URL = process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const hasNimbuspostKey = Boolean(NIMBUSPOST_API_KEY);

// Test data
let testOrderId: string;
let testAWB: string;
let adminToken: string;

describe.skipIf(!hasNimbuspostKey)('Nimbuspost Integration Tests', () => {
  beforeAll(async () => {
    // Get admin token for backend API calls
    try {
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: process.env.TEST_ADMIN_EMAIL || 'monstermen900@gmail.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'your_password',
      });
      adminToken = loginResponse.data.data.token;
    } catch (error) {
      console.warn('⚠️  Could not get admin token. Some tests may fail.');
    }
  });

  describe('1. Authentication Test', () => {
    it('should authenticate with NP-API-KEY header', async () => {
      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/shipments`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      console.log('✅ Authentication successful');
    });
  });

  describe('2. Get All Shipments', () => {
    it('should fetch all shipments', async () => {
      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/shipments`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      console.log(`✅ Fetched ${response.data.data?.length || 0} shipments`);
    });
  });

  describe('3. List All Couriers', () => {
    it('should fetch available couriers', async () => {
      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/couriers`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      console.log(`✅ Found ${response.data.data?.length || 0} couriers`);
    });
  });

  describe('4. List All Warehouses', () => {
    it('should fetch warehouses', async () => {
      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/warehouses`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      console.log(`✅ Found ${response.data.data?.length || 0} warehouses`);
    });
  });

  describe('5. Create Shipment (Backend API)', () => {
    it('should create shipment via backend API', async () => {
      if (!adminToken) {
        console.warn('⚠️  Skipping: Admin token not available');
        return;
      }

      // First, get or create a test order
      const ordersResponse = await axios.get(`${BACKEND_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!ordersResponse.data.data.orders || ordersResponse.data.data.orders.length === 0) {
        console.warn('⚠️  No orders found. Create an order first.');
        return;
      }

      testOrderId = ordersResponse.data.data.orders[0].id;

      // Create shipment
      const shipmentResponse = await axios.post(
        `${BACKEND_URL}/api/shipping/create`,
        { order_id: testOrderId },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(shipmentResponse.status).toBe(200);
      expect(shipmentResponse.data.data.awb_number).toBeDefined();
      testAWB = shipmentResponse.data.data.awb_number;
      console.log(`✅ Shipment created: AWB ${testAWB}`);
    });
  });

  describe('6. Get Specific Shipment Details', () => {
    it('should fetch shipment details by AWB', async () => {
      if (!testAWB) {
        console.warn('⚠️  Skipping: No AWB available');
        return;
      }

      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/shipments/${testAWB}`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      console.log(`✅ Shipment details fetched for AWB ${testAWB}`);
    });
  });

  describe('7. Track Shipment', () => {
    it('should track shipment by AWB', async () => {
      if (!testAWB) {
        console.warn('⚠️  Skipping: No AWB available');
        return;
      }

      const response = await axios.get(`${NIMBUSPOST_BASE_URL}/api/shipments/track/${testAWB}`, {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      console.log(`✅ Tracking info fetched for AWB ${testAWB}`);
    });
  });

  describe('8. Generate Shipping Label', () => {
    it('should generate shipping label', async () => {
      if (!testAWB) {
        console.warn('⚠️  Skipping: No AWB available');
        return;
      }

      const response = await axios.post(
        `${NIMBUSPOST_BASE_URL}/api/shipments/${testAWB}/label`,
        {},
        {
          headers: {
            'NP-API-KEY': NIMBUSPOST_API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      console.log(`✅ Label generated for AWB ${testAWB}`);
    });
  });

  describe('9. Backend Track Endpoint', () => {
    it('should track via backend API', async () => {
      if (!testAWB || !adminToken) {
        console.warn('⚠️  Skipping: AWB or token not available');
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/shipping/track/${testAWB}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      console.log(`✅ Backend tracking successful for AWB ${testAWB}`);
    });
  });

  describe('10. Get Shipping Rates (Backend)', () => {
    it('should get shipping rates', async () => {
      if (!adminToken) {
        console.warn('⚠️  Skipping: Admin token not available');
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/shipping/rates`,
        {
          pickup_pincode: '110001',
          delivery_pincode: '400001',
          weight: 500,
          cod_amount: 0,
        },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.rates).toBeDefined();
      console.log(`✅ Shipping rates fetched`);
    });
  });
});
