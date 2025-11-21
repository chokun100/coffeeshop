export {
  // Re-export queries directly from DB package
  getMenu,
  createOrder,
  getOrderById,
  updateOrderStatus,
  getOrders,
  seedDatabase,
  needsSeeding,
  updateMenuItemImage,
  getShopSettings,
  upsertShopSettings,
  getTables,
  updateTables,
  addMenuItem,
  addCategory,
} from '@coffeeshop/db';
