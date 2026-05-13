import { z } from "zod";

export const createProjectSchema = z.object({
  // =================================
  // BASIC DETAILS
  // =================================
  title: z.string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters"),
  
  proposalType: z.enum(["NEW", "SANCTIONED"], {
    errorMap: () => ({ message: "Proposal type must be NEW or SANCTIONED" })
  }).optional().default("NEW"),

  stationOrCollege: z.string()
    .trim()
    .min(2, "Station or College name is required")
    .max(200, "Station name cannot exceed 200 characters"),

  discipline: z.enum([
    "COMPUTER_SCIENCE",
    "AGRICULTURE",
    "BIOTECHNOLOGY",
    "MECHANICAL",
    "CIVIL",
    "Soil Science",
    "Crop Science",
    "Forestry",
    "Food Technology"
  ], {
    errorMap: () => ({ message: "Please select a valid discipline" })
  }),
  
  year: z.coerce.number()
    .int()
    .min(2000, "Year must be 2000 or later")
    .max(2100),

  // =================================
  // PROJECT CONTENT
  // =================================
  introduction: z.string()
    .trim()
    .min(10, "Introduction must be at least 10 characters")
    .max(5000, "Introduction cannot exceed 5000 characters"),
    
  actionPlan: z.string()
    .trim()
    .min(10, "Action plan must be at least 10 characters")
    .max(5000, "Action plan cannot exceed 5000 characters"),
    
  expectedOutcome: z.string()
    .trim()
    .min(10, "Expected outcome must be at least 10 characters")
    .max(5000, "Expected outcome cannot exceed 5000 characters"),
  
  objectives: z.array(
    z.string().trim().min(5, "Objective too short").max(500, "Objective too long")
  ).min(1, "At least one objective is required").max(20, "Too many objectives"),

  // =================================
  // BUDGET
  // =================================
  budget: z.object({
    nonRecurring: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
    recurringContingency: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
    travellingAllowances: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
    operationalExpenses: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
    manpower: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
  }).optional().default({}),

  // =================================
  // SCIENTIST INVOLVEMENT
  // =================================
  scientistInvolve: z.array(
    z.object({
      scientistName: z.string().trim().min(2, "Scientist name required").max(100, "Name too long"),
      nonRecurring: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
      recurringContingency: z.coerce.number().min(0, "Cannot be negative").optional().default(0),
    })
  ).optional().default([])

});