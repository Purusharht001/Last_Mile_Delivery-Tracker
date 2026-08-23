import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AgentStatus, OrderStatus, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { asyncHandler, ApiError } from "../../middleware/error-handler";
import { requireAuth, requireRole } from "../../middleware/auth";

export const agentsRouter = Router();

const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  homeZoneId: z.string().uuid(),
});

agentsRouter.get(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const agents = await prisma.deliveryAgent.findMany({
      include: { user: true, homeZone: true },
      orderBy: { status: "asc" },
    });
    res.json({ agents });
  }),
);

agentsRouter.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = createAgentSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ApiError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(body.password, 10);
    const agent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: body.name, email: body.email, phone: body.phone, passwordHash, role: Role.AGENT },
      });
      return tx.deliveryAgent.create({
        data: { userId: user.id, homeZoneId: body.homeZoneId },
        include: { user: true, homeZone: true },
      });
    });
    res.status(201).json({ agent });
  }),
);

const statusSchema = z.object({
  status: z.nativeEnum(AgentStatus).optional(),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
});

agentsRouter.put(
  "/:id/status",
  requireAuth,
  requireRole(Role.ADMIN, Role.AGENT),
  asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);
    const agent = await prisma.deliveryAgent.findUnique({ where: { id: req.params.id } });
    if (!agent) throw new ApiError(404, "Agent not found");
    if (req.user!.role === Role.AGENT && agent.userId !== req.user!.sub) {
      throw new ApiError(403, "Cannot modify another agent's status");
    }
    const updated = await prisma.deliveryAgent.update({
      where: { id: req.params.id },
      data: body,
      include: { user: true, homeZone: true },
    });
    res.json({ agent: updated });
  }),
);

agentsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const agent = await prisma.deliveryAgent.findUnique({ where: { id: req.params.id } });
    if (!agent) throw new ApiError(404, "Agent not found");

    const activeOrders = await prisma.order.count({
      where: {
        assignedAgentId: req.params.id,
        status: { in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] },
      },
    });
    if (activeOrders > 0) {
      throw new ApiError(409, "Cannot delete an agent with active orders. Reassign or complete them first.");
    }

    // Unlink completed orders, then delete the agent profile and its user
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { assignedAgentId: req.params.id }, data: { assignedAgentId: null } });
      await tx.deliveryAgent.delete({ where: { id: req.params.id } });
      await tx.user.delete({ where: { id: agent.userId } });
    });

    res.json({ deleted: true });
  }),
);
