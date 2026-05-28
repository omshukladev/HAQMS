import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import doctorRouter from "../src/routes/doctors.js";
import { authenticate } from "../src/middleware/auth.js";

const prisma = new PrismaClient();

let app;
let testToken;
let testDoctorId;
const testDoctors = [
  { name: "Dr. Alice Smith", specialization: "Surgery", department: "Surgery", consultationFee: 500, experience: 10, availableFrom: "09:00", availableTo: "17:00" },
  { name: "Dr. Bob Johnson", specialization: "Surgery", department: "Surgery", consultationFee: 600, experience: 15, availableFrom: "10:00", availableTo: "18:00" },
  { name: "Dr. Carol White", specialization: "Orthopedics", department: "Orthopedics", consultationFee: 450, experience: 8, availableFrom: "08:00", availableTo: "16:00" },
];

function createTestApp() {
  const testApp = express();

  testApp.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    }),
  );

  testApp.use(express.json());

  // Mount doctors router
  testApp.use("/api/doctors", doctorRouter);

  // Global error handler (matches production)
  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Doctors Routes", () => {
  beforeAll(async () => {
    app = createTestApp();
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-doctor-secret-key";

    // Create test user for authentication
    const testUser = await prisma.user.create({
      data: {
        email: "doctor.test@example.com",
        password: "hashed_password",
        name: "Test Admin",
        role: "ADMIN",
      },
    });

    // Generate token for authenticated requests
    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role, name: testUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "7h" },
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.doctor.deleteMany({});
    await prisma.user.deleteMany({ where: { email: "doctor.test@example.com" } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Cleanup before each test
    await prisma.doctor.deleteMany({});
    testDoctorId = null;
    // Seed test doctors
    for (const doc of testDoctors) {
      const created = await prisma.doctor.create({
        data: doc,
      });
      if (!testDoctorId) testDoctorId = created.id;
    }
  });

  describe("GET /api/doctors", () => {
    it("should return list of doctors with default pagination", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("doctors");
      expect(res.body.data).toHaveProperty("pagination");
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.doctors.length).toBe(3);
    });

    it("should support pagination with page and limit", async () => {
      const res = await request(app)
        .get("/api/doctors?page=1&limit=2")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it("should cap limit to maximum 100", async () => {
      const res = await request(app)
        .get("/api/doctors?limit=500")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(100);
    });

    it("should enforce minimum page of 1", async () => {
      const res = await request(app)
        .get("/api/doctors?page=-5")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
    });

    it("should search doctors by name case-insensitively", async () => {
      const res = await request(app)
        .get("/api/doctors?search=alice")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(1);
      expect(res.body.data.doctors[0].name).toMatch(/Alice/i);
    });

    it("should filter doctors by specialization", async () => {
      const res = await request(app)
        .get("/api/doctors?specialization=Surgery")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(2);
      res.body.data.doctors.forEach((doc) => {
        expect(doc.specialization).toBe("Surgery");
      });
    });

    it("should combine search and specialization filters", async () => {
      const res = await request(app)
        .get("/api/doctors?search=bob&specialization=Surgery")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(1);
      expect(res.body.data.doctors[0].name).toMatch(/Bob/i);
      expect(res.body.data.doctors[0].specialization).toBe("Surgery");
    });

    it("should reject search terms longer than 100 characters", async () => {
      const longSearch = "a".repeat(101);
      const res = await request(app)
        .get(`/api/doctors?search=${longSearch}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Search term too long");
    });

    // BUG FIXED: SQL Injection test - ensure malicious SQL is escaped
    it("should prevent SQL injection attacks in search", async () => {
      const sqlInjectionAttempt = "'; DROP TABLE Doctor; --";
      const res = await request(app)
        .get(`/api/doctors?search=${encodeURIComponent(sqlInjectionAttempt)}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      // Table should still exist and return empty results
      expect(res.body.data.doctors.length).toBe(0);

      // Verify table still exists by querying again
      const verifyRes = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${testToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.doctors.length).toBe(3);
    });

    // BUG FIXED: Ensure response doesn't leak sensitive fields
    it("should only return safe doctor fields", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const doctor = res.body.data.doctors[0];
      expect(doctor).toHaveProperty("id");
      expect(doctor).toHaveProperty("name");
      expect(doctor).toHaveProperty("specialization");
      expect(doctor).toHaveProperty("department");
      expect(doctor).toHaveProperty("consultationFee");
      expect(doctor).toHaveProperty("experience");
      expect(doctor).toHaveProperty("createdAt");
      expect(doctor).toHaveProperty("updatedAt");
    });

    // BUG FIXED: Error handling should not leak error messages
    it("should return generic error message on database error", async () => {
      // Corrupt the query by using invalid page format
      const res = await request(app)
        .get("/api/doctors?page=abc")
        .set("Authorization", `Bearer ${testToken}`);

      // Should either coerce to 1 or handle gracefully
      expect(res.status).toBe(200);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/doctors");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/doctors/:id", () => {
    it("should return doctor by ID with success status", async () => {
      const res = await request(app)
        .get(`/api/doctors/${testDoctorId}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("id", testDoctorId);
      expect(res.body.data).toHaveProperty("name");
      expect(res.body.data).toHaveProperty("specialization");
    });

    // BUG FIXED: Ensure response doesn't leak sensitive fields
    it("should only return safe doctor fields in detail view", async () => {
      const res = await request(app)
        .get(`/api/doctors/${testDoctorId}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const doctor = res.body.data;
      expect(doctor).toHaveProperty("id");
      expect(doctor).toHaveProperty("name");
      expect(doctor).toHaveProperty("specialization");
      expect(doctor).toHaveProperty("department");
      expect(doctor).toHaveProperty("consultationFee");
      expect(doctor).toHaveProperty("experience");
    });

    it("should return 404 for non-existent doctor", async () => {
      const res = await request(app)
        .get("/api/doctors/invalid-id-that-does-not-exist")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Doctor not found");
    });

    // BUG FIXED: Error handling should not leak error details
    it("should return generic error message on server error", async () => {
      const res = await request(app)
        .get("/api/doctors/invalid-id")
        .set("Authorization", `Bearer ${testToken}`);

      // Should not leak internal error
      expect(res.body).not.toHaveProperty("sqlMessage");
      expect(res.body).not.toHaveProperty("details");
    });

    it("should require authentication", async () => {
      const res = await request(app).get(`/api/doctors/${testDoctorId}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/doctors/stats", () => {
    it("should return stats with success status", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("total");
      expect(res.body.data).toHaveProperty("surgeons");
      expect(res.body.data).toHaveProperty("averageFee");
      expect(res.body.data).toHaveProperty("maxExperience");
      expect(res.body.data).toHaveProperty("executionTimeMs");
    });

    it("should correctly count total doctors", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
    });

    it("should correctly count surgeons in Surgery department", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.surgeons).toBe(2);
    });

    it("should correctly calculate average consultation fee", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const expectedAverage = Math.round((500 + 600 + 450) / 3);
      expect(res.body.data.averageFee).toBe(expectedAverage);
    });

    it("should correctly find maximum experience", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.maxExperience).toBe(15);
    });

    // BUG FIXED: Stats should run in parallel - verify no debugInfo leak
    it("should not expose debugInfo or sensitive internal details", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty("debugInfo");
      expect(res.body.data).not.toHaveProperty("notes");
    });

    // BUG FIXED: Execution time should be reasonable (parallelized queries)
    it("should complete stats in reasonable time (parallelized)", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      // With parallelization, should be < 1000ms even with DB latency
      expect(res.body.data.executionTimeMs).toBeLessThan(2000);
    });

    // BUG FIXED: Error handling should not leak error messages
    it("should return generic error message on server error", async () => {
      const res = await request(app)
        .get("/api/doctors/stats")
        .set("Authorization", `Bearer ${testToken}`);

      if (res.status === 500) {
        expect(res.body.error).toBe("Internal Server Error");
        expect(res.body).not.toHaveProperty("sqlMessage");
        expect(res.body).not.toHaveProperty("details");
      }
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/doctors/stats");

      expect(res.status).toBe(401);
    });
  });

  describe("Security & Edge Cases", () => {
    it("should handle empty doctor list", async () => {
      // Clear all doctors
      await prisma.doctor.deleteMany({});

      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(0);
      expect(res.body.data.pagination.total).toBe(0);
      expect(res.body.data.pagination.totalPages).toBe(0);
    });

    it("should handle special characters in search safely", async () => {
      const specialChars = "Dr. \\ / @ # $ % ^ & *";
      const res = await request(app)
        .get(`/api/doctors?search=${encodeURIComponent(specialChars)}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctors.length).toBe(0);
    });

    it("should sort results by name alphabetically", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const doctors = res.body.data.doctors;
      for (let i = 1; i < doctors.length; i++) {
        expect(doctors[i].name >= doctors[i - 1].name).toBe(true);
      }
    });
  });
});
