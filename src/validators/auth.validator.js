import { z } from "zod";

const allowedExpertise = [
  "COMPUTER_SCIENCE",
  "AGRICULTURE",
  "BIOTECHNOLOGY",
  "MECHANICAL",
  "CIVIL",
  "Soil Science",
  "Crop Science",
  "Forestry",
  "Food Technology"
];

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["SCIENTIST", "REVIEWER", "ADMIN"]),

  expertise: z.string().optional()
}).superRefine((data, ctx) => {

  // Only validate expertise for REVIEWER
  if (data.role === "REVIEWER") {

    // Expertise required for reviewer
    if (!data.expertise) {

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expertise"],
        message: "Expertise is required for reviewer"
      });

      return;
    }

    // Expertise must match allowed disciplines
    if (!allowedExpertise.includes(data.expertise)) {

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expertise"],
        message: "Invalid expertise selected"
      });

    }
  }

});