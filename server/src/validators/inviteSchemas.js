const { z } = require('zod');

const createInviteSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const acceptInviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(128),
});

module.exports = { createInviteSchema, acceptInviteSchema };
