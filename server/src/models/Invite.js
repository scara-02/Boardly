const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant isolation
inviteSchema.plugin(tenantPlugin);

// Indexes
inviteSchema.index({ tokenHash: 1 });
inviteSchema.index({ tenantId: 1, email: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invite', inviteSchema);
