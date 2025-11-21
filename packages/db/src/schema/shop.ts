import { pgTable, text, timestamp, serial, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'preparing', 'ready', 'completed', 'cancelled']);
export const orderTypeEnum = pgEnum('order_type', ['dine_in', 'takeaway']);
export const sizeEnum = pgEnum('size', ['S', 'M', 'L']);
export const milkTypeEnum = pgEnum('milk_type', ['none', 'whole', 'skim', 'oat', 'soy', 'almond']);
export const sugarLevelEnum = pgEnum('sugar_level', ['none', 'less', 'normal', 'extra']);

// Store settings (single row)
export const shopSettings = pgTable('shop_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('Cafe Station'),
  address: text('address'),
  email: text('email'),
  phone: text('phone'),
  currency: text('currency').notNull().default('THB'),
  logoUrl: text('logo_url'),
  enablePrint: boolean('enable_print').notNull().default(true),
  showStoreDetails: boolean('show_store_details').notNull().default(true),
  showCustomerDetails: boolean('show_customer_details').notNull().default(false),
  printFormat: text('print_format').notNull().default('80mm'),
  printHeader: text('print_header'),
  printFooter: text('print_footer'),
  showNotes: boolean('show_notes').notNull().default(true),
  printToken: boolean('print_token').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const selectShopSettingsSchema = createSelectSchema(shopSettings);

// Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  position: integer('position').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: (name) => name.min(1, { message: 'Name is required' }),
});

export const selectCategorySchema = createSelectSchema(categories);

// Menu Items
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  imageUrl: text('image_url'),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Base schema for menu items
const baseInsertMenuItemSchema = createInsertSchema(menuItems);

// Extend with custom validation
export const insertMenuItemSchema = baseInsertMenuItemSchema.extend({
  name: baseInsertMenuItemSchema.shape.name.min(1, { message: 'Name is required' }),
  priceCents: baseInsertMenuItemSchema.shape.priceCents.min(1, { 
    message: 'Price must be greater than 0' 
  }),
  categoryId: baseInsertMenuItemSchema.shape.categoryId.min(1, { 
    message: 'Category is required' 
  }),
});

export const selectMenuItemSchema = createSelectSchema(menuItems);

// Orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  orderType: orderTypeEnum('order_type').notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  totalCents: integer('total_cents').notNull(),
  queueNumber: text('queue_number'),
  userId: text('user_id'), // Optional, for logged-in users
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Base schema for orders
const baseInsertOrderSchema = createInsertSchema(orders);

export const insertOrderSchema = baseInsertOrderSchema.extend({
  customerName: baseInsertOrderSchema.shape.customerName.min(1, { 
    message: 'Name is required' 
  }),
  totalCents: baseInsertOrderSchema.shape.totalCents.min(0, { 
    message: 'Total must be 0 or more' 
  }),
});

export const selectOrderSchema = createSelectSchema(orders);

// Order Items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  size: sizeEnum('size').notNull().default('M'),
  milkType: milkTypeEnum('milk_type').notNull().default('none'),
  sugarLevel: sugarLevelEnum('sugar_level').notNull().default('normal'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Add any additional indexes here
  orderIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// Uploaded files (e.g., logos, images)
export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  type: text('type').notNull().default('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Base schema for order items
const baseInsertOrderItemSchema = createInsertSchema(orderItems);

export const insertOrderItemSchema = baseInsertOrderItemSchema.extend({
  orderId: baseInsertOrderItemSchema.shape.orderId.min(1, { 
    message: 'Order ID is required' 
  }),
  menuItemId: baseInsertOrderItemSchema.shape.menuItemId.min(1, { 
    message: 'Menu item is required' 
  }),
  itemName: baseInsertOrderItemSchema.shape.itemName.min(1, { 
    message: 'Item name is required' 
  }),
  quantity: baseInsertOrderItemSchema.shape.quantity.min(1, { 
    message: 'Quantity must be at least 1' 
  }),
  unitPriceCents: baseInsertOrderItemSchema.shape.unitPriceCents.min(0, { 
    message: 'Price must be 0 or more' 
  }),
});

export const selectOrderItemSchema = createSelectSchema(orderItems);

// Types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// Seed data
export const defaultCategories = [
  { name: 'Espresso', description: 'Rich, concentrated coffee shots', position: 1 },
  { name: 'Milk', description: 'Espresso with steamed milk and foam', position: 2 },
  { name: 'Iced', description: 'Chilled coffee over ice', position: 3 },
  { name: 'Seasonal', description: 'Limited-time holiday specials', position: 4 },
];

export const defaultMenuItems = [
  // Espresso-based
  { name: 'Espresso', description: 'Rich, concentrated shot of coffee.', priceCents: 6000, categoryId: 1, position: 1 },
  { name: 'Ristretto', description: 'Short, more intense espresso shot.', priceCents: 6500, categoryId: 1, position: 2 },
  { name: 'Doppio', description: 'Double shot of espresso.', priceCents: 7500, categoryId: 1, position: 3 },
  { name: 'Americano', description: 'Espresso diluted with hot water.', priceCents: 6500, categoryId: 1, position: 4 },
  { name: 'Long Black', description: 'Hot water first, topped with espresso.', priceCents: 6500, categoryId: 1, position: 5 },
  { name: 'Macchiato', description: 'Espresso topped with a small amount of foam.', priceCents: 7000, categoryId: 1, position: 6 },

  // Milk-based
  { name: 'Latte', description: 'Espresso with steamed milk and light foam.', priceCents: 8500, categoryId: 2, position: 1 },
  { name: 'Cappuccino', description: 'Equal parts espresso, steamed milk, foam.', priceCents: 8500, categoryId: 2, position: 2 },
  { name: 'Flat White', description: 'Velvety microfoam over a double espresso.', priceCents: 9000, categoryId: 2, position: 3 },
  { name: 'Mocha', description: 'Chocolate, steamed milk, espresso.', priceCents: 9500, categoryId: 2, position: 4 },
  { name: 'Cortado', description: 'Equal parts espresso and warm milk.', priceCents: 8000, categoryId: 2, position: 5 },
  { name: 'Vanilla Latte', description: 'Latte with vanilla syrup.', priceCents: 9500, categoryId: 2, position: 6 },
  { name: 'Caramel Latte', description: 'Latte sweetened with caramel.', priceCents: 10000, categoryId: 2, position: 7 },
  { name: 'Hazelnut Latte', description: 'Latte with hazelnut syrup.', priceCents: 10000, categoryId: 2, position: 8 },

  // Iced
  { name: 'Iced Americano', description: 'Chilled espresso with cold water over ice.', priceCents: 7000, categoryId: 3, position: 1 },
  { name: 'Iced Latte', description: 'Chilled espresso with milk over ice.', priceCents: 9500, categoryId: 3, position: 2 },
  { name: 'Iced Mocha', description: 'Iced latte with chocolate.', priceCents: 10500, categoryId: 3, position: 3 },
  { name: 'Iced Caramel Macchiato', description: 'Espresso, milk, vanilla, caramel drizzle.', priceCents: 11500, categoryId: 3, position: 4 },
  { name: 'Nitro Cold Brew', description: 'Cold brew infused with nitrogen for a creamy mouthfeel.', priceCents: 12000, categoryId: 3, position: 5 },
  { name: 'Cold Brew', description: 'Slow steeped, smooth and refreshing.', priceCents: 9500, categoryId: 3, position: 6 },

  // Seasonal
  { name: 'Pumpkin Spice Latte', description: 'Latte with pumpkin spice blend.', priceCents: 11500, categoryId: 4, position: 1 },
  { name: 'Peppermint Mocha', description: 'Chocolate + peppermint with steamed milk.', priceCents: 11500, categoryId: 4, position: 2 },
  { name: 'Gingerbread Latte', description: 'Warm spices with steamed milk.', priceCents: 11500, categoryId: 4, position: 3 },
  { name: 'Eggnog Latte', description: 'Holiday classic with eggnog.', priceCents: 12000, categoryId: 4, position: 4 },
  { name: 'Affogato', description: 'Vanilla gelato drowned in hot espresso.', priceCents: 11000, categoryId: 4, position: 5 },
];
