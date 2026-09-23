const mongoose = require('mongoose');

/**
 * Mongoose plugin that enforces tenant isolation on all queries and saves.
 *
 * How it works:
 * 1. Adds a required `tenantId` field (ObjectId, indexed) to the schema.
 * 2. Intercepts all read/write query middleware to automatically inject
 *    a `tenantId` filter from the query options — controllers never
 *    need to manually filter by tenant.
 * 3. Provides a `Model.forTenant(tenantId)` static that returns a
 *    scoped query helper.
 *
 * Usage in services:
 *   // Option A — static helper (preferred):
 *   const boards = await Board.forTenant(tenantId).find({ ... });
 *
 *   // Option B — set tenantId in query options:
 *   const boards = await Board.find({ ... }).setOptions({ tenantId });
 *
 *   // Saving:
 *   const board = new Board({ tenantId, name: 'My Board' });
 *   await board.save();
 */
function tenantPlugin(schema) {
  // ── 1. Add tenantId field ──────────────────────────────────────────
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: 'Tenant',
    },
  });

  // ── 2. Query middleware — auto-inject tenantId filter ──────────────
  const queryHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
    'estimatedDocumentCount',
  ];

  for (const hook of queryHooks) {
    schema.pre(hook, function () {
      const tenantId = this.getOptions().tenantId;
      if (tenantId) {
        this.where({ tenantId });
      }
    });
  }

  // ── 3. Aggregate middleware ────────────────────────────────────────
  schema.pre('aggregate', function () {
    const options = this.options || {};
    if (options.tenantId) {
      this.pipeline().unshift({
        $match: { tenantId: new mongoose.Types.ObjectId(options.tenantId) },
      });
    }
  });

  // ── 4. Save middleware — ensure tenantId is always present ─────────
  schema.pre('save', function (next) {
    if (!this.tenantId) {
      return next(new Error('tenantId is required when saving a tenant-scoped document'));
    }
    next();
  });

  // ── 5. Static helper — Model.forTenant(tenantId) ──────────────────
  schema.statics.forTenant = function (tenantId) {
    const model = this;

    return {
      find(filter = {}, projection, options) {
        return model.find(filter, projection, options).setOptions({ tenantId });
      },
      findOne(filter = {}, projection, options) {
        return model.findOne(filter, projection, options).setOptions({ tenantId });
      },
      findById(id, projection, options) {
        return model.findById(id, projection, options).setOptions({ tenantId });
      },
      findOneAndUpdate(filter, update, options = {}) {
        return model.findOneAndUpdate(filter, update, { ...options, tenantId, new: true });
      },
      findOneAndDelete(filter, options = {}) {
        return model.findOneAndDelete(filter, { ...options, tenantId });
      },
      updateOne(filter, update, options = {}) {
        return model.updateOne(filter, update, { ...options, tenantId });
      },
      updateMany(filter, update, options = {}) {
        return model.updateMany(filter, update, { ...options, tenantId });
      },
      deleteOne(filter, options = {}) {
        return model.deleteOne(filter, { ...options, tenantId });
      },
      deleteMany(filter = {}, options = {}) {
        return model.deleteMany(filter, { ...options, tenantId });
      },
      countDocuments(filter = {}, options = {}) {
        return model.countDocuments(filter, { ...options, tenantId });
      },
      create(doc) {
        return model.create({ ...doc, tenantId });
      },
    };
  };
}

module.exports = tenantPlugin;
