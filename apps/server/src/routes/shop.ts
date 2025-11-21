import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { 
  createApiResponse, 
  createErrorResponse 
} from '../lib/api-utils';
import * as shopService from '../services/shop-service';

const shop = new Hono<{
  Variables: {
    userId?: string;
  };
}>();

// Store settings
const shopSettingsSchema = z.object({
  storeName: z.string().min(1).max(255),
  address: z.string().max(1000).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(255).optional().nullable(),
  currency: z.string().min(1).max(10),
  logoUrl: z.string().optional().nullable(),
  enablePrint: z.boolean().optional(),
  showStoreDetails: z.boolean().optional(),
  showCustomerDetails: z.boolean().optional(),
  printFormat: z.enum(['58mm', '80mm']).optional(),
  printHeader: z.string().max(255).optional().nullable(),
  printFooter: z.string().max(255).optional().nullable(),
  showNotes: z.boolean().optional(),
  printToken: z.boolean().optional(),
});

shop.get('/settings', async (c) => {
  try {
    const settings = await shopService.getShopSettings();
    return createApiResponse(c, { settings });
  } catch (error) {
    console.error('Error fetching shop settings:', error);
    return createErrorResponse(c, 'Failed to fetch shop settings', 500);
  }
});

shop.put('/settings', zValidator('json', shopSettingsSchema.partial()), async (c) => {
  try {
    const body = c.req.valid('json');
    const updated = await shopService.upsertShopSettings(body);
    return createApiResponse(c, { settings: updated });
  } catch (error) {
    console.error('Error updating shop settings:', error);
    return createErrorResponse(c, 'Failed to update shop settings', 500);
  }
});

// Get menu with categories and items
shop.get('/menu', async (c) => {
  try {
    const menu = await shopService.getMenu();
    return createApiResponse(c, { categories: menu });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return createErrorResponse(c, 'Failed to fetch menu', 500);
  }
});

// Update a menu item's image URL
const updateItemImageSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
});

shop.patch('/menu/items/:id/image', zValidator('json', updateItemImageSchema), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return createErrorResponse(c, 'Invalid menu item ID', 400);
    }
    const body = c.req.valid('json');
    const updated = await shopService.updateMenuItemImage(id, body.imageUrl ?? null);
    if (!updated) {
      return createErrorResponse(c, 'Menu item not found', 404);
    }
    return createApiResponse(c, { item: updated });
  } catch (error) {
    console.error('Error updating menu item image:', error);
    return createErrorResponse(c, 'Failed to update menu item image', 500);
  }
});

// Create order
const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  orderType: z.enum(['dine_in', 'takeaway']),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    itemName: z.string().min(1, 'Item name is required'),
    quantity: z.number().int().positive(),
    unitPriceCents: z.number().int().nonnegative(),
    size: z.enum(['S', 'M', 'L']).default('M'),
    milkType: z.enum(['none', 'whole', 'skim', 'oat', 'soy', 'almond']).default('none'),
    sugarLevel: z.enum(['none', 'less', 'normal', 'extra']).default('normal'),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

shop.post('/orders', zValidator('json', createOrderSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const userId = c.get('userId');
    
    const order = await shopService.createOrder(
      data.customerName,
      data.orderType,
      data.items,
      data.notes,
      userId,
    );

    return createApiResponse(c, { order }, 201);
  } catch (error) {
    console.error('Error creating order:', error);
    return createErrorResponse(c, 'Failed to create order', 500);
  }
});

// Get order by ID
shop.get('/orders/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return createErrorResponse(c, 'Invalid order ID', 400);
    }

    const order = await shopService.getOrderById(id);
    if (!order) {
      return createErrorResponse(c, 'Order not found', 404);
    }

    return createApiResponse(c, { order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return createErrorResponse(c, 'Failed to fetch order', 500);
  }
});

// Update order status (for staff)
const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled']),
});

shop.patch('/orders/:id/status', zValidator('json', updateOrderStatusSchema), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return createErrorResponse(c, 'Invalid order ID', 400);
    }

    const { status } = c.req.valid('json');
    const updatedOrder = await shopService.updateOrderStatus(id, status);

    if (!updatedOrder) {
      return createErrorResponse(c, 'Order not found', 404);
    }

    return createApiResponse(c, { order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    return createErrorResponse(c, 'Failed to update order status', 500);
  }
});

// Get recent orders (for dashboard)
shop.get('/orders', async (c) => {
  try {
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '10');
    
    let orders = await shopService.getOrders(limit);
    if (status) {
      orders = orders.filter((o) => o.status === (status as any));
    }
    return createApiResponse(c, { orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return createErrorResponse(c, 'Failed to fetch orders', 500);
  }
});

// Seed database (for development)
shop.post('/seed', async (c) => {
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse(c, 'Not found', 404);
  }

  try {
    const { needsSeeding } = shopService;
    if (await needsSeeding()) {
      const result = await shopService.seedDatabase();
      return createApiResponse(c, { message: 'Database seeded successfully', ...result });
    }
    return createApiResponse(c, { message: 'Database already seeded' });
  } catch (error) {
    console.error('Error seeding database:', error);
    return createErrorResponse(c, 'Failed to seed database', 500);
  }
});

export { shop as shopRouter };
