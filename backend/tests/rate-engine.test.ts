import { OrderType, PaymentType, RateCategory, SurchargeType } from "@prisma/client";
import {
  calculateCharge,
  calculateCodSurcharge,
  calculateVolumetricWeight,
  resolveRateCategory,
} from "../src/modules/orders/rate-engine";

describe("calculateVolumetricWeight", () => {
  it("divides L x B x H by 5000", () => {
    expect(calculateVolumetricWeight(50, 40, 30)).toBeCloseTo(12, 5);
  });
});

describe("resolveRateCategory", () => {
  it("returns INTRA_ZONE when pickup and drop zones match", () => {
    expect(resolveRateCategory("zone-a", "zone-a")).toBe(RateCategory.INTRA_ZONE);
  });
  it("returns INTER_ZONE when pickup and drop zones differ", () => {
    expect(resolveRateCategory("zone-a", "zone-b")).toBe(RateCategory.INTER_ZONE);
  });
});

describe("calculateCodSurcharge", () => {
  it("returns 0 when no config is provided", () => {
    expect(calculateCodSurcharge(500, null)).toBe(0);
  });
  it("applies a flat surcharge", () => {
    expect(calculateCodSurcharge(500, { surchargeType: SurchargeType.FLAT, value: 25 })).toBe(25);
  });
  it("applies a percentage surcharge of the base charge", () => {
    expect(calculateCodSurcharge(500, { surchargeType: SurchargeType.PERCENTAGE, value: 2 })).toBe(10);
  });
});

describe("calculateCharge", () => {
  const rateCard = { baseFare: 30, ratePerKg: 10, minCharge: 40 };

  it("bills on actual weight when it exceeds volumetric weight", () => {
    // volumetric = (10*10*10)/5000 = 0.2kg; actual = 5kg -> billable = 5kg
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z1",
        length: 10,
        breadth: 10,
        height: 10,
        actualWeight: 5,
        orderType: OrderType.B2C,
        paymentType: PaymentType.PREPAID,
      },
      rateCard,
      null,
    );
    expect(result.volumetricWeight).toBeCloseTo(0.2, 5);
    expect(result.billableWeight).toBe(5);
    expect(result.category).toBe(RateCategory.INTRA_ZONE);
    // 30 + 10*5 = 80, above minCharge of 40
    expect(result.baseCharge).toBe(80);
    expect(result.codSurcharge).toBe(0);
    expect(result.totalCharge).toBe(80);
  });

  it("bills on volumetric weight when it exceeds actual weight", () => {
    // volumetric = (50*40*30)/5000 = 12kg; actual = 3kg -> billable = 12kg
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z2",
        length: 50,
        breadth: 40,
        height: 30,
        actualWeight: 3,
        orderType: OrderType.B2C,
        paymentType: PaymentType.PREPAID,
      },
      rateCard,
      null,
    );
    expect(result.billableWeight).toBeCloseTo(12, 5);
    expect(result.category).toBe(RateCategory.INTER_ZONE);
    // 30 + 10*12 = 150
    expect(result.baseCharge).toBe(150);
  });

  it("applies the rate card's minimum charge floor for very light packages", () => {
    // volumetric = (2*2*2)/5000 = 0.0016kg; actual = 0.1kg -> billable ~0.1kg
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z1",
        length: 2,
        breadth: 2,
        height: 2,
        actualWeight: 0.1,
        orderType: OrderType.B2C,
        paymentType: PaymentType.PREPAID,
      },
      rateCard,
      null,
    );
    // 30 + 10*0.1 = 31, below minCharge of 40 -> floored to 40
    expect(result.baseCharge).toBe(40);
  });

  it("adds a flat COD surcharge on top of the base charge for COD orders", () => {
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z1",
        length: 10,
        breadth: 10,
        height: 10,
        actualWeight: 5,
        orderType: OrderType.B2C,
        paymentType: PaymentType.COD,
      },
      rateCard,
      { surchargeType: SurchargeType.FLAT, value: 25 },
    );
    expect(result.baseCharge).toBe(80);
    expect(result.codSurcharge).toBe(25);
    expect(result.totalCharge).toBe(105);
  });

  it("adds a percentage COD surcharge computed off the base charge", () => {
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z2",
        length: 50,
        breadth: 40,
        height: 30,
        actualWeight: 3,
        orderType: OrderType.B2B,
        paymentType: PaymentType.COD,
      },
      rateCard,
      { surchargeType: SurchargeType.PERCENTAGE, value: 2 },
    );
    // baseCharge = 150, surcharge = 2% of 150 = 3
    expect(result.baseCharge).toBe(150);
    expect(result.codSurcharge).toBe(3);
    expect(result.totalCharge).toBe(153);
  });

  it("does not apply a COD surcharge for PREPAID orders even if a config exists", () => {
    const result = calculateCharge(
      {
        pickupZoneId: "z1",
        dropZoneId: "z1",
        length: 10,
        breadth: 10,
        height: 10,
        actualWeight: 5,
        orderType: OrderType.B2C,
        paymentType: PaymentType.PREPAID,
      },
      rateCard,
      { surchargeType: SurchargeType.FLAT, value: 25 },
    );
    expect(result.codSurcharge).toBe(0);
    expect(result.totalCharge).toBe(80);
  });
});
