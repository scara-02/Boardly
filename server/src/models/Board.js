const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant isolation
boardSchema.plugin(tenantPlugin);

// Indexes
boardSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Board', boardSchema);
