const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const tenantPlugin = require('../plugins/tenantPlugin');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant isolation plugin (adds tenantId field + query middleware)
userSchema.plugin(tenantPlugin);

// Compound unique index: email unique per tenant
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Hash password before saving (only if modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare a plaintext password against the stored hash.
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Exclude passwordHash from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
