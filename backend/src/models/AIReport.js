import mongoose from "mongoose";

const REPORT_TYPES = ["categorizer", "patterns", "savings", "budget", "full"];

const aiReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, "Report type is required."],
      enum: {
        values: REPORT_TYPES,
        message: "Invalid report type.",
      },
    },
    monthsAnalyzed: {
      type: Number,
      required: [true, "Months analyzed is required."],
      min: [1, "Must analyze at least 1 month."],
      max: [24, "Cannot analyze more than 24 months at once."],
      default: 6,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Report data is required."],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success",
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [500, "Error message cannot exceed 500 characters."],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// ─── Compound indexes for query optimization ─────────────────────────────────
// Allows ultra-fast retrieval of the latest report for a specific user and type
aiReportSchema.index({ user: 1, type: 1, createdAt: -1 });

// Index for quickly finding failed reports that might need a retry
aiReportSchema.index({ status: 1, createdAt: -1 });

// ─── Static: Retrieve latest report ──────────────────────────────────────────
aiReportSchema.statics.getLatestReport = async function (userId, type) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  return this.findOne({ user: userObjId, type, status: "success" })
    .sort({ createdAt: -1 })
    .lean(); // .lean() optimizes query performance by returning plain JS objects
};

const AIReport = mongoose.model("AIReport", aiReportSchema);

export { REPORT_TYPES };
export default AIReport;
