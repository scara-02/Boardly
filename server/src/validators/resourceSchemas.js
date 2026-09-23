const { z } = require('zod');

const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

const updateBoardSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

const createListSchema = z.object({
  name: z.string().trim().min(1).max(200),
  position: z.number().int().min(0).optional(),
});

const updateListSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  position: z.number().int().min(0).optional(),
});

const reorderListSchema = z.object({
  listIds: z.array(z.string()).min(1),
});

const createCardSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000).optional().default(''),
  assigneeId: z.string().nullable().optional().default(null),
  dueDate: z.string().datetime().nullable().optional().default(null),
  position: z.number().int().min(0).optional(),
});

const updateCardSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  position: z.number().int().min(0).optional(),
  listId: z.string().optional(), // for moving between lists
});

module.exports = {
  createBoardSchema,
  updateBoardSchema,
  createListSchema,
  updateListSchema,
  reorderListSchema,
  createCardSchema,
  updateCardSchema,
};
