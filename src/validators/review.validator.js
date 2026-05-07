import { z } from "zod";

export const submitReviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"], {
    errorMap: () => ({
      message: "Decision must be either APPROVED or REJECTED"
    })
  }),

  comment: z.string()
    .trim()
    .min(10, "Comment must be at least 10 characters")
    .max(2000, "Comment cannot exceed 2000 characters")
});

export const getProjectsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),

  page: z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),

  limit: z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional()
});