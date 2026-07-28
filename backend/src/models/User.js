import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required."],
      trim:     true,
      minlength: [2,  "Name must be at least 2 characters."],
      maxlength: [50, "Name cannot exceed 50 characters."],
    },
    email: {
      type:      String,
      required:  [true, "Email is required."],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
    },
    password: {
      type:      String,
      required:  [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select:    false, // never returned in queries by default
    },
    monthlyIncome: {
      type:    Number,
      default: 3000,
      min:     [0, "Monthly income cannot be negative."],
    },
    monthlyBudget: {
      type:    Number,
      default: 2400,
      min:     [0, "Monthly budget cannot be negative."],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Hash password before saving ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

// Compare plain-text password against stored hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Generate signed JWT for this user
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

// ─── Strip sensitive fields from JSON output ──────────────────────────────────
userSchema.methods.toSafeObject = function () {
  return {
    _id:           this._id,
    name:          this.name,
    email:         this.email,
    monthlyIncome: this.monthlyIncome,
    monthlyBudget: this.monthlyBudget,
    createdAt:     this.createdAt,
    updatedAt:     this.updatedAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;
