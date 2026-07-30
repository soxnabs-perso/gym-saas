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
      required: [true, 'Phone number is required'],
      trim: true,
    },
    membershipPlan: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'pay_as_you_go'],
      default: 'monthly',
    },
    subscriptionFee: {
      type: Number,
      min: [0, 'Subscription fee cannot be negative'],
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
    archivedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

customerSchema.index(
  { owner: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

export default mongoose.model('Customer', customerSchema);
