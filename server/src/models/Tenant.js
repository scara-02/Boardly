const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 60,
      match: /^[a-z0-9-]+$/,
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    settings: {
      maxUsers: { type: Number, default: 5 },
      maxBoards: { type: Number, default: 10 },
      rateLimit: { type: Number, default: 100 }, // requests per hour
    },
  },
  {
    timestamps: true,
  }
);

// Note: slug index is created automatically by the `unique: true` in schema definition.

// Set default settings based on plan before save
tenantSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('plan')) {
    const defaults = {
      free: { maxUsers: 5, maxBoards: 10, rateLimit: 100 },
      pro: { maxUsers: 100, maxBoards: 500, rateLimit: 5000 },
    };
    const planDefaults = defaults[this.plan] || defaults.free;
    this.settings = { ...planDefaults, ...this.settings };
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
