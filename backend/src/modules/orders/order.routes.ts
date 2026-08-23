import { Router } from "express";
import { z } from "zod";
import { OrderStatus, OrderType, PaymentType, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { asyncHandler, ApiError } from "../../middleware/error-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as orderService from "./order.service";

export const orderRouter = Router();

const quoteSchema = z.object({
  pickupPincode: z.string().min(1),
  dropPincode: z.string().min(1),
  length: z.number().positive(),
  breadth: z.number().positive(),
  height: z.number().positive(),
  actualWeight: z.number().positive(),
  orderType: z.nativeEnum(OrderType),
  paymentType: z.nativeEnum(PaymentType),
});

orderRouter.post(
  "/quote",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = quoteSchema.parse(req.body);
    const quote = await orderService.computeQuote(body);
    res.json({ quote });
  }),
);

const createOrderSchema = quoteSchema.extend({
  pickupAddress: z.string().min(1),
  dropAddress: z.string().min(1),
  customerId: z.string().uuid().optional(), // admin-on-behalf
});

orderRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);

    let customerId = req.user!.sub;
    if (body.customerId) {
      if (req.user!.role !== Role.ADMIN) {
        throw new ApiError(403, "Only admins can create orders on behalf of another customer");
      }
      const customer = await prisma.user.findUnique({ where: { id: body.customerId } });
      if (!customer || customer.role !== Role.CUSTOMER) {
        throw new ApiError(404, "Customer not found");
      }
      customerId = customer.id;
    } else if (req.user!.role === Role.AGENT) {
      throw new ApiError(403, "Agents cannot create orders");
    }

    const order = await orderService.createOrder({
      ...body,
      customerId,
      createdById: req.user!.sub,
    });
    res.status(201).json({ order });
  }),
);

const listQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  zoneId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

orderRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = listQuerySchema.parse(req.query);
    const result = await orderService.listOrders(req.user!.role, req.user!.sub, filters);
    res.json(result);
  }),
);

orderRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrderWithTimeline(req.params.id);
    if (req.user!.role === Role.CUSTOMER && order.customerId !== req.user!.sub) {
      throw new ApiError(403, "Not your order");
    }
    res.json({ order });
  }),
);

const assignSchema = z.object({ agentId: z.string().uuid() });

orderRouter.put(
  "/:id/assign",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = assignSchema.parse(req.body);
    const order = await orderService.manualAssign(req.params.id, body.agentId, req.user!.sub);
    res.json({ order });
  }),
);

orderRouter.post(
  "/:id/auto-assign",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const order = await orderService.autoAssign(req.params.id, req.user!.sub, Role.ADMIN);
    res.json({ order });
  }),
);

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

orderRouter.put(
  "/:id/status",
  requireAuth,
  requireRole(Role.AGENT, Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);

    if (req.user!.role === Role.AGENT) {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order) throw new ApiError(404, "Order not found");
      const agent = await prisma.deliveryAgent.findUnique({ where: { userId: req.user!.sub } });
      if (!agent || order.assignedAgentId !== agent.id) {
        throw new ApiError(403, "Order not assigned to you");
      }
      const updated = await orderService.updateStatus(
        req.params.id,
        body.status,
        req.user!.sub,
        Role.AGENT,
        body.notes,
        false,
      );
      return res.json({ order: updated });
    }

    // Admin can override to any status regardless of the normal lifecycle.
    const updated = await orderService.updateStatus(
      req.params.id,
      body.status,
      req.user!.sub,
      Role.ADMIN,
      body.notes,
      true,
    );
    res.json({ order: updated });
  }),
);

const rescheduleSchema = z.object({ newDeliveryDate: z.coerce.date() });

orderRouter.post(
  "/:id/reschedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = rescheduleSchema.parse(req.body);
    if (req.user!.role === Role.CUSTOMER) {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order || order.customerId !== req.user!.sub) {
        throw new ApiError(403, "Not your order");
      }
    }
    const order = await orderService.rescheduleOrder(req.params.id, body.newDeliveryDate, req.user!.sub, req.user!.role);
    res.json({ order });
  }),
);
