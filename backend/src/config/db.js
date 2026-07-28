import mongoose from "mongoose";
import env from "./env.js";

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// ─── Register connection event listeners once at module level ─────────────────
// (Registering inside connectDB would duplicate them on every reconnect)
mongoose.connection.on("disconnected", () =>
  console.warn("[DB] MongoDB disconnected")
);
mongoose.connection.on("reconnected", () =>
  console.log("[DB] MongoDB reconnected")
);
mongoose.connection.on("error", (err) =>
  console.error("[DB] MongoDB connection error:", err.message)
);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, MONGO_OPTIONS);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] Primary Atlas connection failed: ${err.message}`);

    // In development mode, automatically fall back to local MongoDB if Atlas connection fails
    if (env.isDev && !env.mongoUri.includes("127.0.0.1") && !env.mongoUri.includes("localhost")) {
      console.warn("[DB] Attempting automatic fallback to local MongoDB...");
      try {
        const localUri = "mongodb://127.0.0.1:27017/spendsense";
        const conn = await mongoose.connect(localUri, MONGO_OPTIONS);
        console.log(`[DB] MongoDB connected (Local Fallback): ${conn.connection.host}`);
        return;
      } catch (localErr) {
        console.error(`[DB] Local MongoDB fallback also failed: ${localErr.message}`);
      }
    }

    process.exit(1);
  }
};

// Graceful shutdown
const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log("[DB] MongoDB connection closed");
};

export { connectDB, disconnectDB };
