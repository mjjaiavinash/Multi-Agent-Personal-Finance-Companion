import dotenv from "dotenv";
dotenv.config();

const required = [
  "MONGO_URI",
  "JWT_SECRET",
  "GROQ_API_KEY",
  "CLIENT_URL",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[Config] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const env = {
  port:            process.env.PORT || 5000,
  nodeEnv:         process.env.NODE_ENV || "development",
  mongoUri:        process.env.MONGO_URI,
  jwtSecret:       process.env.JWT_SECRET,
  jwtExpiresIn:    process.env.JWT_EXPIRES_IN || "7d",
  groqApiKey:      process.env.GROQ_API_KEY,
  groqModel:       process.env.GROQ_MODEL       || "llama-3.3-70b-versatile",
  groqTimeoutMs:   parseInt(process.env.GROQ_TIMEOUT_MS  || "60000", 10),
  groqMaxRetries:  parseInt(process.env.GROQ_MAX_RETRIES || "3",     10),
  clientUrl:       process.env.CLIENT_URL,
  isDev:           process.env.NODE_ENV !== "production",
};

export default env;
