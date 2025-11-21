import { desc, eq, sql } from 'drizzle-orm';
import { db } from '..';
import { 
  categories, 
  defaultCategories, 
  defaultMenuItems, 
  menuItems, 
  orders, 
  orderItems,
  shopSettings,
} from '../schema/shop';

// Helper type for menu items with category
export type MenuCategory = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  items: Array<{
    id: number;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    position: number;
  }>;
};

// Store settings
export async function getShopSettings() {
  const rows = await db.select().from(shopSettings).limit(1);
  if (rows.length > 0) return rows[0];

  // If no row yet, create default
  const [created] = await db
    .insert(shopSettings)
    .values({})
    .returning();
  return created;
}

export async function upsertShopSettings(input: {
  storeName?: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  currency?: string;
  logoUrl?: string | null;
  enablePrint?: boolean;
  showStoreDetails?: boolean;
  showCustomerDetails?: boolean;
  printFormat?: string;
  printHeader?: string | null;
  printFooter?: string | null;
  showNotes?: boolean;
  printToken?: boolean;

}) {
  // getShopSettings() always returns a row (creates default if missing)
  const current = await getShopSettings();
  const [updated] = await db
    .update(shopSettings)
    .set({
      storeName: input.storeName ?? current.storeName,
      address: input.address ?? current.address,
      email: input.email ?? current.email,
      phone: input.phone ?? current.phone,
      currency: input.currency ?? current.currency,
      logoUrl: input.logoUrl ?? current.logoUrl,
      enablePrint: input.enablePrint ?? current.enablePrint,
      showStoreDetails: input.showStoreDetails ?? current.showStoreDetails,
      showCustomerDetails: input.showCustomerDetails ?? current.showCustomerDetails,
      printFormat: input.printFormat ?? current.printFormat,
      printHeader: input.printHeader ?? current.printHeader,
      printFooter: input.printFooter ?? current.printFooter,
      showNotes: input.showNotes ?? current.showNotes,
      printToken: input.printToken ?? current.printToken,
      updatedAt: sql`now()`,
    })
    .where(eq(shopSettings.id, current.id))
    .returning();

  return updated;
}

export async function getMenu(): Promise<MenuCategory[]> {
  // Get all categories
  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(categories.position, categories.id);
  
  // Get all active menu items
  const allMenuItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isActive, true))
    .orderBy(menuItems.position, menuItems.id);
  
  // Group items by category
  return allCategories.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl,
    position: category.position,
    items: allMenuItems
      .filter(item => item.categoryId === category.id)
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        position: item.position,
      }))
  }));
}

export async function createOrder(
  customerName: string,
  orderType: 'dine_in' | 'takeaway',
  items: Array<{
    menuItemId: number;
    quantity: number;
    size: 'S' | 'M' | 'L';
    milkType: 'none' | 'whole' | 'skim' | 'oat' | 'soy' | 'almond';
    sugarLevel: 'none' | 'less' | 'normal' | 'extra';
    notes?: string;
    itemName: string;
    unitPriceCents: number;
  }>,
  notes?: string,
  userId?: string
) {
  try {
    return await db.transaction(async (tx) => {
      // Calculate total
      const totalCents = items.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0
      );

      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          customerName,
          orderType,
          status: 'pending',
          totalCents,
          notes,
          userId,
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create order');
      }

      // Generate queue number in format M01, M02, ...
      const queueNumber = `M${String(order.id).padStart(2, '0')}`;

      const [orderWithQueue] = await tx
        .update(orders)
        .set({ queueNumber })
        .where(eq(orders.id, order.id))
        .returning();

      // Create order items
      const orderItemsData = items.map((item) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        size: item.size,
        milkType: item.milkType,
        sugarLevel: item.sugarLevel,
        notes: item.notes,
      }));

      await tx.insert(orderItems).values(orderItemsData);

      return orderWithQueue;
    });
  } catch (err: any) {
    // Fallback for environments using neon-http driver that doesn't support transactions
    if (typeof err?.message === 'string' && err.message.includes('No transactions support in neon-http driver')) {
      // Calculate total
      const totalCents = items.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0
      );

      const [order] = await db
        .insert(orders)
        .values({
          customerName,
          orderType,
          status: 'pending',
          totalCents,
          notes,
          userId,
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create order');
      }

      const orderItemsData = items.map((item) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        size: item.size,
        milkType: item.milkType,
        sugarLevel: item.sugarLevel,
        notes: item.notes,
      }));

      await db.insert(orderItems).values(orderItemsData);

      return orderWithQueue;
    }
    throw err;
  }
}

export async function getOrderById(id: number) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return {
    ...order,
    items,
  };
}

export async function updateOrderStatus(id: number, status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled') {
  const [order] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  return order;
}

export async function getOrders(limit = 50) {
  const ordersList = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      orderType: orders.orderType,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`count(${orderItems.id})`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return ordersList;
}

// Update a menu item's image URL
export async function updateMenuItemImage(id: number, imageUrl: string | null) {
  const [item] = await db
    .update(menuItems)
    .set({ imageUrl, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning();
  return item;
}

// Seed the database with initial data
export async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');
  
  // Insert categories
  console.log('  → Inserting categories...');
  const insertedCategories = await db
    .insert(categories)
    .values(defaultCategories)
    .onConflictDoNothing()
    .returning();
  
  console.log(`  ✓ Inserted ${insertedCategories.length} categories`);
  
  // Insert menu items
  console.log('  → Inserting menu items...');
  const insertedMenuItems = await db
    .insert(menuItems)
    .values(defaultMenuItems)
    .onConflictDoNothing()
    .returning();
  
  console.log(`  ✓ Inserted ${insertedMenuItems.length} menu items`);
  
  console.log('✅ Database seeding completed!');
  return {
    categories: insertedCategories,
    menuItems: insertedMenuItems,
  };
}

// Check if database needs seeding
export async function needsSeeding(): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);
  
  return result[0]?.count === 0;
}
