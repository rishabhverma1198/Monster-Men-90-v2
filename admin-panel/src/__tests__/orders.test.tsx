import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useParams } from 'react-router-dom';
import { orderApi } from '../lib/api';
import Orders from '../pages/Orders';
import OrderDetails from '../pages/OrderDetails';

// Mock useParams for OrderDetails tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  };
});

// Mock the API
vi.mock('../lib/api', () => ({
  orderApi: {
    getOrders: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

/**
 * Orders List Component Tests
 */
describe('Orders Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render orders list', async () => {
    const mockOrders = [
      {
        id: '1',
        order_number: 'MM90-1234567890-abc123',
        status: 'pending',
        total_amount: 999,
        user_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        profiles: {
          id: 'user-1',
          email: 'customer@test.com',
          full_name: 'Test Customer',
        },
        order_items: [],
      },
    ];

    vi.mocked(orderApi.getOrders).mockResolvedValue({
      orders: mockOrders,
      total: 1,
      page: 1,
      limit: 20,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('MM90-1234567890-abc123')).toBeInTheDocument();
    });
  });

  it('should display status badges correctly', async () => {
    const mockOrders = [
      {
        id: '1',
        order_number: 'MM90-123',
        status: 'pending',
        total_amount: 999,
        user_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        profiles: { id: 'user-1', email: 'test@test.com', full_name: 'Test' },
        order_items: [],
      },
    ];

    vi.mocked(orderApi.getOrders).mockResolvedValue({
      orders: mockOrders,
      total: 1,
      page: 1,
      limit: 20,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  it('should filter orders by status', async () => {
    const user = userEvent.setup();
    
    vi.mocked(orderApi.getOrders).mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 20,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    );

    const statusFilter = screen.getByRole('combobox');
    await user.selectOptions(statusFilter, 'pending');

    await waitFor(() => {
      expect(orderApi.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });
  });

  it('should show empty state when no orders', async () => {
    vi.mocked(orderApi.getOrders).mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 20,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <Orders />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
    });
  });
});

/**
 * Order Details Component Tests
 */
describe('OrderDetails Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render order details', async () => {
    const mockOrder = {
      id: '1',
      order_number: 'MM90-123',
      status: 'pending',
      total_amount: 999,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: 'user-1',
        email: 'customer@test.com',
        full_name: 'Test Customer',
      },
      order_items: [
        {
          id: '1',
          quantity: 2,
          price_at_purchase: 499,
          products: {
            id: 'prod-1',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
          },
        },
      ],
    };

    vi.mocked(orderApi.getOrderById).mockResolvedValue(mockOrder);

    // Mock useParams to return order ID
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ id: '1' }),
      };
    });

    render(
      <BrowserRouter>
        <OrderDetails />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MM90-123/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should open status update modal', async () => {
    const user = userEvent.setup();
    const mockOrder = {
      id: '1',
      order_number: 'MM90-123',
      status: 'pending',
      total_amount: 999,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      profiles: { id: 'user-1', email: 'test@test.com', full_name: 'Test' },
      order_items: [],
    };

    vi.mocked(orderApi.getOrderById).mockResolvedValue(mockOrder);

    // Mock useParams
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ id: '1' }),
      };
    });

    render(
      <BrowserRouter>
        <OrderDetails />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MM90-123/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/update order status/i)).toBeInTheDocument();
    });
  });

  it('should update order status', async () => {
    const user = userEvent.setup();
    const mockOrder = {
      id: '1',
      order_number: 'MM90-123',
      status: 'pending',
      total_amount: 999,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      profiles: { id: 'user-1', email: 'test@test.com', full_name: 'Test' },
      order_items: [],
    };

    const updatedOrder = { ...mockOrder, status: 'confirmed' };

    vi.mocked(orderApi.getOrderById).mockResolvedValue(mockOrder);
    vi.mocked(orderApi.updateOrderStatus).mockResolvedValue(updatedOrder);

    // Mock useParams
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ id: '1' }),
      };
    });

    render(
      <BrowserRouter>
        <OrderDetails />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MM90-123/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/update order status/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, 'confirmed');

    const confirmButtons = screen.getAllByRole('button', { name: /update status/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(orderApi.updateOrderStatus).toHaveBeenCalledWith('1', {
        status: 'confirmed',
        notes: undefined,
      });
    });
  });
});
