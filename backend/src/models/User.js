import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    gymName: {
      type: String,
      required: [true, 'Gym name is required'],
      trim: true,
      maxlength: 120,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is invalid'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['owner', 'manager'],
      default: 'owner',
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

// A throwaway hash with the same cost factor as a real one. Comparing against
// it when the email is unknown keeps failed logins the same duration whether
// or not the account exists, so response time cannot be used to enumerate users.
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-password', 12);

userSchema.statics.compareDummyPassword = function compareDummyPassword(candidate) {
  return bcrypt.compare(candidate, DUMMY_HASH);
};

export default mongoose.model('User', userSchema);
