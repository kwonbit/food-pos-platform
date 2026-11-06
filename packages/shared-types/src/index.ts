export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COOKING"
  | "SERVED"
  | "CANCELLED";

export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | "PARTIAL_REFUNDED";

export type OrderType = "DINE_IN" | "TAKEOUT" | "DELIVERY" | "PHONE" | "QR";

export interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableName?: string;
  customerName: string;
  itemSummary: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}
