import { z } from "zod";
import { loginRequestSchema, loginResponseSchema } from "./schemas";

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
