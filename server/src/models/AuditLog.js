const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'tenant.updated',
        'tenant.deleted',
        'user.invited',
        'user.joined',
        'user.role_changed',
        'user.removed',
        'board.created',
        'board.updated',
        'board.deleted',
        'list.created',
        'list.updated',
        'list.deleted',
        'card.created',
        'card.updated',
        'card.deleted',
        'card.moved',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['tenant', 'user', 'board', 'list', 'card', 'invite'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // we use our own `timestamp` field
  }
);

// Apply tenant isolation
auditLogSchema.plugin(tenantPlugin);

// Indexes — optimized for chronological queries within a tenant
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
