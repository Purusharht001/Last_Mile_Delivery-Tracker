export type Role = "CUSTOMER" | "AGENT" | "ADMIN";
export type OrderType = "B2B" | "B2C";
export type PaymentType = "PREPAID" | "COD";
export type RateCategory = "INTRA_ZONE" | "INTER_ZONE";
export type SurchargeType = "FLAT" | "PERCENTAGE";
export type AgentStatus = "AVAILABLE" | "BUSY" | "OFFLINE";
export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RESCHEDULED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
}

export interface Area {
  id: string;
  name: string;
  pincode: string;
  zoneId: string;
  zone?: Zone;
}

export interface RateCard {
  id: string;
  orderType: OrderType;
  category: RateCategory;
  baseFare: number;
  ratePerKg: number;
  minCharge: number;
}

export interface CodConfig {
  id: string;
  orderType: OrderType;
  surchargeType: SurchargeType;
  value: number;
}

export interface DeliveryAgent {
  id: string;
  userId: string;
  homeZoneId: string;
  status: AgentStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  user?: User;
  homeZone?: Zone;
}

export interface Quote {
  volumetricWeight: number;
  billableWeight: number;
  category: RateCategory;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  pickupZoneId: string;
  dropZoneId: string;
  pickupAreaId: string;
  dropAreaId: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  actorId: string;
  actorRole: Role;
  notes?: string | null;
  createdAt: string;
  actor?: User;
}

export interface Order {
  id: string;
  customerId: string;
  pickupAddress: string;
  dropAddress: string;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  volumetricWeight: number;
  billableWeight: number;
  orderType: OrderType;
  paymentType: PaymentType;
  rateCategory: RateCategory;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  status: OrderStatus;
  assignedAgentId?: string | null;
  scheduledDeliveryDate?: string | null;
  createdAt: string;
  pickupArea?: Area;
  dropArea?: Area;
  assignedAgent?: DeliveryAgent;
  statusHistory?: OrderStatusHistoryEntry[];
}
