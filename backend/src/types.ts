import type { Request } from "express";

export type AuthPayload = {
  userId: string;
  phone: string;
  role?: "user" | "admin";
};

export type AuthenticatedRequest = Request & {
  auth?: AuthPayload;
};
