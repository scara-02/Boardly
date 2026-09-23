const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const listSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Board',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant isolation
listSchema.plugin(tenantPlugin);

// Indexes
listSchema.index({ tenantId: 1, boardId: 1, position: 1 });

module.exports = mongoose.model('List', listSchema);
