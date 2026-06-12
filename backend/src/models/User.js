import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false,   // never returned in queries by default
    },
    role: {
      type:    String,
      enum:    ['creator', 'taker'],
      default: 'taker',
    },
    refreshToken: {
      type:   String,
      select: false,      // never returned in queries by default
    },
  },
  { timestamps: true }
)

/* ── Hash password before saving ───────────────────────── */
userSchema.pre('save', async function () {
  // Only hash if password was actually changed or is new
  if (!this.isModified('password')) {
    return;
  }
  
  // Hash the password cleanly using bcryptjs
  this.password = await bcrypt.hash(this.password, 12);
});

/* ── Instance method: compare password ─────────────────── */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)
export default User