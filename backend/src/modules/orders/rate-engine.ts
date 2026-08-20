import { OrderType, PaymentType, RateCategory, SurchargeType } from "@prisma/client";

export interface RateCardInput {
  baseFare: number;
  ratePerKg: number;
  minCharge: number;
}

export interface CodConfigInput {
  surchargeType: SurchargeType;
  value: number;
}

export interface RateEngineInput {
  pickupZoneId: string;
  dropZoneId: string;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

export interface RateEngineResult {
  volumetricWeight: number;
  billableWeight: number;
  category: RateCategory;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

const VOLUMETRIC_DIVISOR = 5000;

export function calculateVolumetricWeight(length: number, breadth: number, height: number): number {
  return (length * breadth * height) / VOLUMETRIC_DIVISOR;
}

export function resolveRateCategory(pickupZoneId: string, dropZoneId: string): RateCategory {
  return pickupZoneId === dropZoneId ? RateCategory.INTRA_ZONE : RateCategory.INTER_ZONE;
}

export function calculateCodSurcharge(baseCharge: number, config: CodConfigInput | null): number {
  if (!config) return 0;
  if (config.surchargeType === SurchargeType.FLAT) return config.value;
  return roundToPaise(baseCharge * (config.value / 100));
}

function roundToPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pure charge calculation — no DB access, no side effects. Callers fetch the
 * applicable RateCard and (for COD orders) CodSurchargeConfig and pass them
 * in, so the same function powers both the no-op /orders/quote preview and
 * the authoritative calculation at order-creation time.
 */
export function calculateCharge(
  input: RateEngineInput,
  rateCard: RateCardInput,
  codConfig: CodConfigInput | null,
): RateEngineResult {
  const volumetricWeight = calculateVolumetricWeight(input.length, input.breadth, input.height);
  const billableWeight = Math.max(input.actualWeight, volumetricWeight);
  const category = resolveRateCategory(input.pickupZoneId, input.dropZoneId);

  const rawBaseCharge = rateCard.baseFare + rateCard.ratePerKg * billableWeight;
  const baseCharge = roundToPaise(Math.max(rawBaseCharge, rateCard.minCharge));

  const codSurcharge =
    input.paymentType === PaymentType.COD ? calculateCodSurcharge(baseCharge, codConfig) : 0;

  const totalCharge = roundToPaise(baseCharge + codSurcharge);

  return { volumetricWeight, billableWeight, category, baseCharge, codSurcharge, totalCharge };
}
