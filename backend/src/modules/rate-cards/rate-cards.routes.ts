import { Router } from "express";
import { z } from "zod";
import { OrderType, RateCategory, Role, SurchargeType } from "@prisma/client";
import { prisma } from "../../config/db";
import { asyncHandler } from "../../middleware/error-handler";
import { requireAuth, requireRole } from "../../middleware/auth";

export const rateCardsRouter = Router();

const rateCardSchema = z.object({
  orderType: z.nativeEnum(OrderType),
  category: z.nativeEnum(RateCategory),
  baseFare: z.number().nonnegative(),
  ratePerKg: z.number().nonnegative(),
  minCharge: z.number().nonnegative(),
});

rateCardsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const rateCards = await prisma.rateCard.findMany({ orderBy: [{ orderType: "asc" }, { category: "asc" }] });
    res.json({ rateCards });
  }),
);

// Upsert on (orderType, category) — admin sets rates per order-type/category
// pair; there is no per-zone-pair table, matching the spec's "intra and
// inter-zone rates separately for B2B and B2C" wording exactly.
rateCardsRouter.put(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = rateCardSchema.parse(req.body);
    const rateCard = await prisma.rateCard.upsert({
      where: { orderType_category: { orderType: body.orderType, category: body.category } },
      create: body,
      update: body,
    });
    res.json({ rateCard });
  }),
);

const codConfigSchema = z.object({
  orderType: z.nativeEnum(OrderType),
  surchargeType: z.nativeEnum(SurchargeType),
  value: z.number().nonnegative(),
});

rateCardsRouter.get(
  "/cod-surcharge",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const configs = await prisma.codSurchargeConfig.findMany({ orderBy: { orderType: "asc" } });
    res.json({ configs });
  }),
);

rateCardsRouter.put(
  "/cod-surcharge",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = codConfigSchema.parse(req.body);
    const config = await prisma.codSurchargeConfig.upsert({
      where: { orderType: body.orderType },
      create: body,
      update: body,
    });
    res.json({ config });
  }),
);
