import mongoose from 'mongoose';

/**
 * Record of a request to let the client retry safely
 */
const idempotencyKeySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    /** Hash of the endpoint and the request body */
    fingerprint: {
      type: String,
      required: true,
    },
    /** Null until the request finishes */
    statusCode: {
      type: Number,
      default: null,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

idempotencyKeySchema.index({ owner: 1, key: 1 }, { unique: true });

idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.model('IdempotencyKey', idempotencyKeySchema);
