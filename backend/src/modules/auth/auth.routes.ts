import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { ApiError, asyncHandler } from "../../middleware/error-handler";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });
    const token = signToken(user.id, user.role, user.email);
    res.status(201).json({ token, user: toPublicUser(user) });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Invalid credentials");
    }
    const token = signToken(user.id, user.role, user.email);
    res.json({ token, user: toPublicUser(user) });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    res.json({ user: toPublicUser(user) });
  }),
);

function signToken(sub: string, role: Role, email: string) {
  return jwt.sign({ sub, role, email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

function toPublicUser(user: { id: string; name: string; email: string; role: Role; phone: string | null }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
}
