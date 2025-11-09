import { z } from 'zod';
import { 
  orderStatusEnum, 
  orderTypeEnum, 
  sizeEnum, 
  milkTypeEnum, 
  sugarLevelEnum,
  type Category,
  type MenuItem,
  type Order,
  type OrderItem
} from '@coffeeshop/db';

// Request/Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Menu
export type MenuResponse = {
  categories: (Omit<Category, 'createdAt' | 'updatedAt'> & {
    items: Array<Omit<MenuItem, 'categoryId' | 'createdAt' | 'updatedAt'>>;
  })[];
};

// Order
export type CreateOrderRequest = {
  customerName: string;
  orderType: z.infer<typeof orderTypeEnum>;
  items: Array<{
    menuItemId: number;
    quantity: number;
    size: z.infer<typeof sizeEnum>;
    milkType: z.infer<typeof milkTypeEnum>;
    sugarLevel: z.infer<typeof sugarLevelEnum>;
    notes?: string;
  }>;
  notes?: string;
};

export type OrderResponse = Omit<Order, 'createdAt' | 'updatedAt'> & {
  items: Array<Omit<OrderItem, 'orderId' | 'createdAt'>>;
};

export type UpdateOrderStatusRequest = {
  status: z.infer<typeof orderStatusEnum>;
};

// Admin
export type OrdersListResponse = Array<{
  id: number;
  customerName: string;
  orderType: string;
  status: string;
  totalCents: number;
  createdAt: string;
  itemCount: number;
}>;
