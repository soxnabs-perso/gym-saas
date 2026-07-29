import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    membershipPlan: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'pay_as_you_go'],
      default: 'monthly',
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A manager should not have two customers with the exact same email, but any
// number may have no email at all.
//
// `sparse` cannot express that on a compound index: it only skips a document
// when every indexed field is absent, and `owner` is always set, so each
// email-less customer was indexed as (owner, null) and the second one
// collided. A partial index restricts the constraint to documents that
// actually carry an email.
customerSchema.index(
  { owner: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

export default mongoose.model('Customer', customerSchema);