import { z } from "zod";

export const submitReviewSchema = z.object({
  body: z.object({
    decision: z.enum(["APPROVED", "REJECTED", "REVISION_REQUIRED"], {
      errorMap: () => ({
        message: "Decision must be either APPROVED, REJECTED, or REVISION_REQUIRED"
      })
    }),

    comment: z.string()
      .trim()
      .min(10, "Comment must be at least 10 characters")
      .max(2000, "Comment cannot exceed 2000 characters")
  })
});

export const getProjectsQuerySchema = z.object({
  query: z.object({
    status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED", "DRAFT"]).optional(),
    page: z.string()
      .regex(/^\d+$/, "Page must be a number")
      .transform(Number)
      .optional()
      .default("1"),
    limit: z.string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform(Number)
      .optional()
      .default("10")
  })
});