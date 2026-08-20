import "dotenv/config";
import { PrismaClient, OrderType, RateCategory, SurchargeType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const northZone = await prisma.zone.upsert({
    where: { code: "NORTH" },
    create: { name: "North Zone", code: "NORTH" },
    update: {},
  });
  const southZone = await prisma.zone.upsert({
    where: { code: "SOUTH" },
    create: { name: "South Zone", code: "SOUTH" },
    update: {},
  });

  await prisma.area.upsert({
    where: { pincode: "110001" },
    create: { name: "Connaught Place", pincode: "110001", zoneId: northZone.id },
    update: { zoneId: northZone.id },
  });
  await prisma.area.upsert({
    where: { pincode: "110002" },
    create: { name: "Daryaganj", pincode: "110002", zoneId: northZone.id },
    update: { zoneId: northZone.id },
  });
  await prisma.area.upsert({
    where: { pincode: "560001" },
    create: { name: "MG Road", pincode: "560001", zoneId: southZone.id },
    update: { zoneId: southZone.id },
  });
  await prisma.area.upsert({
    where: { pincode: "560002" },
    create: { name: "Shivajinagar", pincode: "560002", zoneId: southZone.id },
    update: { zoneId: southZone.id },
  });

  const rateCards: Array<{ orderType: OrderType; category: RateCategory; baseFare: number; ratePerKg: number; minCharge: number }> = [
    { orderType: OrderType.B2C, category: RateCategory.INTRA_ZONE, baseFare: 30, ratePerKg: 10, minCharge: 40 },
    { orderType: OrderType.B2C, category: RateCategory.INTER_ZONE, baseFare: 50, ratePerKg: 15, minCharge: 70 },
    { orderType: OrderType.B2B, category: RateCategory.INTRA_ZONE, baseFare: 60, ratePerKg: 8, minCharge: 80 },
    { orderType: OrderType.B2B, category: RateCategory.INTER_ZONE, baseFare: 90, ratePerKg: 12, minCharge: 120 },
  ];
  for (const rc of rateCards) {
    await prisma.rateCard.upsert({
      where: { orderType_category: { orderType: rc.orderType, category: rc.category } },
      create: rc,
      update: rc,
    });
  }

  await prisma.codSurchargeConfig.upsert({
    where: { orderType: OrderType.B2C },
    create: { orderType: OrderType.B2C, surchargeType: SurchargeType.FLAT, value: 25 },
    update: {},
  });
  await prisma.codSurchargeConfig.upsert({
    where: { orderType: OrderType.B2B },
    create: { orderType: OrderType.B2B, surchargeType: SurchargeType.PERCENTAGE, value: 2 },
    update: {},
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { name: "Admin", email: adminEmail, passwordHash: adminHash, role: Role.ADMIN },
    update: {},
  });

  const agentEmail = "agent1@example.com";
  const agentHash = await bcrypt.hash("Agent123!", 10);
  const agentUser = await prisma.user.upsert({
    where: { email: agentEmail },
    create: { name: "Agent One", email: agentEmail, passwordHash: agentHash, role: Role.AGENT },
    update: {},
  });
  await prisma.deliveryAgent.upsert({
    where: { userId: agentUser.id },
    create: { userId: agentUser.id, homeZoneId: northZone.id, currentLat: 28.6315, currentLng: 77.2167 },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
