const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    tokenHash: {
      type: String,
      required: true,
    },
    familyId: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    replacedByTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant isolation
refreshTokenSchema.plugin(tenantPlugin);

// Indexes
refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ userId: 1, familyId: 1 });
refreshTokenSchema.index({ tenantId: 1, userId: 1 });
// TTL index to auto-expire old tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
