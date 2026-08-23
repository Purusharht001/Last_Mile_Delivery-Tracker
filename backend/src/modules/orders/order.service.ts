import { AgentStatus, Order, OrderStatus, OrderType, PaymentType, RateCategory, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../middleware/error-handler";
import { calculateCharge, RateEngineInput, RateEngineResult } from "./rate-engine";
import { pickBestAgent } from "./assignment-engine";
import { notifyOrderStatusChange } from "../notifications/notification.service";

// Statuses that count toward an agent's active workload for load-balancing
// in the assignment engine.
const ACTIVE_AGENT_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
];

// Agent-driven transitions. Admin override bypasses this map entirely.
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.ASSIGNED],
  ASSIGNED: [OrderStatus.PICKED_UP, OrderStatus.FAILED],
  PICKED_UP: [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
  IN_TRANSIT: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  DELIVERED: [],
  FAILED: [OrderStatus.RESCHEDULED],
  RESCHEDULED: [OrderStatus.ASSIGNED],
};

export interface QuoteInput {
  pickupPincode: string;
  dropPincode: string;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

async function resolveArea(pincode: string) {
  const area = await prisma.area.findUnique({ where: { pincode }, include: { zone: true } });
  if (!area) {
    throw new ApiError(422, `No zone configured for pincode ${pincode}`);
  }
  return area;
}

async function getRateCardOrThrow(orderType: OrderType, category: RateCategory) {
  const rateCard = await prisma.rateCard.findUnique({
    where: { orderType_category: { orderType, category } },
  });
  if (!rateCard) {
    throw new ApiError(
      422,
      `No rate card configured for ${orderType} / ${category}. Admin must configure it first.`,
    );
  }
  return rateCard;
}

async function getCodConfig(orderType: OrderType) {
  return prisma.codSurchargeConfig.findUnique({ where: { orderType } });
}

export async function computeQuote(input: QuoteInput): Promise<
  RateEngineResult & { pickupZoneId: string; dropZoneId: string; pickupAreaId: string; dropAreaId: string }
> {
  const [pickupArea, dropArea] = await Promise.all([
    resolveArea(input.pickupPincode),
    resolveArea(input.dropPincode),
  ]);

  const engineInput: RateEngineInput = {
    pickupZoneId: pickupArea.zoneId,
    dropZoneId: dropArea.zoneId,
    length: input.length,
    breadth: input.breadth,
    height: input.height,
    actualWeight: input.actualWeight,
    orderType: input.orderType,
    paymentType: input.paymentType,
  };

  const category =
    pickupArea.zoneId === dropArea.zoneId ? RateCategory.INTRA_ZONE : RateCategory.INTER_ZONE;
  const rateCard = await getRateCardOrThrow(input.orderType, category);
  const codConfig = input.paymentType === PaymentType.COD ? await getCodConfig(input.orderType) : null;

  const result = calculateCharge(engineInput, rateCard, codConfig);
  return { ...result, pickupZoneId: pickupArea.zoneId, dropZoneId: dropArea.zoneId, pickupAreaId: pickupArea.id, dropAreaId: dropArea.id };
}

export interface CreateOrderInput extends QuoteInput {
  pickupAddress: string;
  dropAddress: string;
  customerId: string;
  createdById: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const quote = await computeQuote(input);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: input.customerId,
        createdById: input.createdById,
        pickupAddress: input.pickupAddress,
        pickupAreaId: quote.pickupAreaId,
        dropAddress: input.dropAddress,
        dropAreaId: quote.dropAreaId,
        length: input.length,
        breadth: input.breadth,
        height: input.height,
        actualWeight: input.actualWeight,
        volumetricWeight: quote.volumetricWeight,
        billableWeight: quote.billableWeight,
        orderType: input.orderType,
        paymentType: input.paymentType,
        rateCategory: quote.category,
        baseCharge: quote.baseCharge,
        codSurcharge: quote.codSurcharge,
        totalCharge: quote.totalCharge,
        status: OrderStatus.CREATED,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: created.id,
        status: OrderStatus.CREATED,
        actorId: input.createdById,
        actorRole: input.customerId === input.createdById ? Role.CUSTOMER : Role.ADMIN,
        notes: "Order created",
      },
    });
    return created;
  });

  return order;
}

export interface OrderFilters {
  status?: OrderStatus;
  zoneId?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listOrders(role: Role, userId: string, filters: OrderFilters): Promise<PaginatedOrders> {
  const where: Record<string, unknown> = {};

  if (role === Role.CUSTOMER) {
    where.customerId = userId;
  } else if (role === Role.AGENT) {
    const agent = await prisma.deliveryAgent.findUnique({ where: { userId } });
    where.assignedAgentId = agent?.id ?? "__none__";
  }
  // ADMIN sees everything, subject to explicit filters below.

  if (filters.status) where.status = filters.status;
  if (filters.agentId) where.assignedAgentId = filters.agentId;

  const fullWhere = filters.zoneId
    ? {
        ...where,
        OR: [
          { pickupArea: { zoneId: filters.zoneId } },
          { dropArea: { zoneId: filters.zoneId } },
        ],
      }
    : where;

  const page = Math.max(filters.page ?? 1, 1);
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: fullWhere,
      include: { pickupArea: { include: { zone: true } }, dropArea: { include: { zone: true } }, assignedAgent: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: fullWhere }),
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOrderWithTimeline(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      pickupArea: { include: { zone: true } },
      dropArea: { include: { zone: true } },
      assignedAgent: { include: { user: true } },
      customer: true,
      statusHistory: { orderBy: { createdAt: "asc" }, include: { actor: true } },
      rescheduleRequests: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

async function writeHistoryAndNotify(
  orderId: string,
  status: OrderStatus,
  actorId: string,
  actorRole: Role,
  notes?: string,
) {
  await prisma.orderStatusHistory.create({
    data: { orderId, status, actorId, actorRole, notes },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (order) {
    await notifyOrderStatusChange({
      orderId,
      customerEmail: order.customer.email,
      customerId: order.customerId,
      status,
      notes,
    });
  }
}

async function assignAgentInternal(orderId: string, agentId: string, actorId: string, actorRole: Role) {
  const agent = await prisma.deliveryAgent.findUnique({ where: { id: agentId } });
  if (!agent) throw new ApiError(404, "Agent not found");

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { assignedAgentId: agentId, status: OrderStatus.ASSIGNED },
  });
  await writeHistoryAndNotify(orderId, OrderStatus.ASSIGNED, actorId, actorRole, `Assigned to agent ${agentId}`);
  return order;
}

export async function manualAssign(orderId: string, agentId: string, actorId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (!["CREATED", "RESCHEDULED"].includes(order.status)) {
    throw new ApiError(422, `Cannot assign an order in status ${order.status}`);
  }
  return assignAgentInternal(orderId, agentId, actorId, Role.ADMIN);
}

export async function autoAssign(orderId: string, actorId: string, actorRole: Role) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { pickupArea: true } });
  if (!order) throw new ApiError(404, "Order not found");
  if (!["CREATED", "RESCHEDULED"].includes(order.status)) {
    throw new ApiError(422, `Cannot assign an order in status ${order.status}`);
  }

  const agents = await prisma.deliveryAgent.findMany({ where: { status: AgentStatus.AVAILABLE } });
  const activeCounts = await prisma.order.groupBy({
    by: ["assignedAgentId"],
    where: { assignedAgentId: { in: agents.map((a) => a.id) }, status: { in: ACTIVE_AGENT_STATUSES } },
    _count: true,
  });
  const countByAgent = new Map(activeCounts.map((c) => [c.assignedAgentId, c._count]));

  const candidates = agents.map((a) => ({
    id: a.id,
    homeZoneId: a.homeZoneId,
    status: a.status,
    currentLat: a.currentLat,
    currentLng: a.currentLng,
    activeOrderCount: countByAgent.get(a.id) ?? 0,
  }));

  const best = pickBestAgent(candidates, { pickupZoneId: order.pickupArea.zoneId });
  if (!best) {
    throw new ApiError(409, "No available agents to auto-assign");
  }

  return assignAgentInternal(orderId, best.id, actorId, actorRole);
}

export async function updateStatus(
  orderId: string,
  newStatus: OrderStatus,
  actorId: string,
  actorRole: Role,
  notes?: string,
  isOverride = false,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");

  if (!isOverride) {
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(422, `Invalid transition from ${order.status} to ${newStatus}`);
    }
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
  await writeHistoryAndNotify(
    orderId,
    newStatus,
    actorId,
    actorRole,
    isOverride ? `Admin override${notes ? ": " + notes : ""}` : notes,
  );
  return updated;
}

export async function rescheduleOrder(
  orderId: string,
  newDeliveryDate: Date,
  actorId: string,
  actorRole: Role,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.status !== OrderStatus.FAILED) {
    throw new ApiError(422, "Only failed deliveries can be rescheduled");
  }

  const lastStatus = order.statusHistory[0];

  const result = await prisma.$transaction(async (tx) => {
    await tx.rescheduleRequest.create({
      data: {
        orderId,
        previousAttemptStatusId: lastStatus.id,
        newDeliveryDate,
        requestedById: actorId,
      },
    });
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RESCHEDULED, scheduledDeliveryDate: newDeliveryDate, assignedAgentId: null },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.RESCHEDULED,
        actorId,
        actorRole,
        notes: `Rescheduled for ${newDeliveryDate.toISOString()}`,
      },
    });
    return updated;
  });

  const customer = await prisma.user.findUnique({ where: { id: order.customerId } });
  if (customer) {
    await notifyOrderStatusChange({
      orderId,
      customerEmail: customer.email,
      customerId: customer.id,
      status: OrderStatus.RESCHEDULED,
      notes: `New delivery date: ${newDeliveryDate.toDateString()}`,
    });
  }

  return result;
}
