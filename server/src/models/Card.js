const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const cardSchema = new mongoose.Schema(
  {
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'List',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
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
cardSchema.plugin(tenantPlugin);

// Indexes
cardSchema.index({ tenantId: 1, listId: 1, position: 1 });

module.exports = mongoose.model('Card', cardSchema);
