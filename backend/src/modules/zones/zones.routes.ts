import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { asyncHandler, ApiError } from "../../middleware/error-handler";
import { requireAuth, requireRole } from "../../middleware/auth";

export const zonesRouter = Router();

const zoneSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

zonesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const zones = await prisma.zone.findMany({ orderBy: { name: "asc" } });
    res.json({ zones });
  }),
);

zonesRouter.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = zoneSchema.parse(req.body);
    const zone = await prisma.zone.create({ data: body });
    res.status(201).json({ zone });
  }),
);

zonesRouter.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = zoneSchema.partial().parse(req.body);
    const zone = await prisma.zone.update({ where: { id: req.params.id }, data: body });
    res.json({ zone });
  }),
);

const areaSchema = z.object({
  name: z.string().min(1),
  pincode: z.string().min(1),
  zoneId: z.string().uuid(),
});

zonesRouter.get(
  "/areas",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const areas = await prisma.area.findMany({ include: { zone: true }, orderBy: { pincode: "asc" } });
    res.json({ areas });
  }),
);

zonesRouter.post(
  "/areas",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = areaSchema.parse(req.body);
    const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) throw new ApiError(404, "Zone not found");
    const area = await prisma.area.create({ data: body });
    res.status(201).json({ area });
  }),
);

zonesRouter.put(
  "/areas/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = areaSchema.partial().parse(req.body);
    const area = await prisma.area.update({ where: { id: req.params.id }, data: body });
    res.json({ area });
  }),
);
