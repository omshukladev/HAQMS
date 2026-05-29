const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const doctorRoutes = require("./routes/doctors");
const appointmentRoutes = require("./routes/appointments");
const queueRoutes = require("./routes/queue");
const reportRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// Enable CORS for all origins
// FIX: In production, this should be restricted to specific origins to prevent unauthorized access. Allowing all origins can lead to security vulnerabilities such as Cross-Site Request Forgery (CSRF) and data leaks.

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true, // if you switch to cookie-based auth later
  }),
);
// Body parser
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/reports", reportRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message:
      "Hospital Appointment and Queue Management System (HAQMS) Backend API",
    status: "Running",
    version: "1.0.0-deliberate-bugs",
  });
});

// GLOBAL ERROR HANDLER
// FIX: This is a critical security flaw. In production, this should not expose stack traces or sensitive information. It should log the error internally and return a generic message to the client.
app.use((err, req, res, next) => {
  console.error("[CRITICAL-ERROR]:", err);
  res.status(500).json({
    message: "An unexpected internal server error occurred",
  });
});

// Listen on port
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   HAQMS BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`   ENVIRONMENT: ${process.env.NODE_ENV}`);
  console.log(`===================================================`);
});

// Catch unhandled rejections

// FIX: This is a critical security flaw. Unhandled promise rejections can crash the server and expose sensitive information in the logs. In production, this should be handled gracefully without crashing the server or exposing stack traces.
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
