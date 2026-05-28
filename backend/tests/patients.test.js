import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import cors from "cors";
import request from "supertest";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let app;
let patientsRouter;
let testToken;
let adminToken;
let doctor;
let patientA;
let patientB;

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
  testApp.use("/api/patients", patientsRouter);

  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Patient Routes", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-patients-secret";

    const mod = await import("../src/routes/patients.js");
    patientsRouter = mod.default ?? mod;

    app = createTestApp();

    testToken = jwt.sign(
      { id: "patients-test-user", email: "patients@example.com", role: "RECEPTIONIST" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    adminToken = jwt.sign(
      { id: "patients-admin-user", email: "admin@example.com", role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  beforeEach(async () => {
    await prisma.queueToken.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.doctor.deleteMany({});

    doctor = await prisma.doctor.create({
      data: {
        name: "Dr. Patient Test",
        specialization: "General Medicine",
        department: "Medicine",
        consultationFee: 400,
        experience: 9,
        availableFrom: "09:00",
        availableTo: "17:00",
      },
    });

    patientA = await prisma.patient.create({
      data: {
        name: "Patient Alpha",
        email: "alpha@example.com",
        phoneNumber: "+15550001111",
        age: 32,
        gender: "Male",
        medicalHistory: "Diabetes",
      },
    });

    patientB = await prisma.patient.create({
      data: {
        name: "Patient Beta",
        email: "beta@example.com",
        phoneNumber: "+15550002222",
        age: 26,
        gender: "Female",
        medicalHistory: null,
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patientA.id,
        doctorId: doctor.id,
        appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
        reason: "Checkup",
        status: "PENDING",
      },
    });
  });

  afterAll(async () => {
    await prisma.queueToken.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.doctor.deleteMany({});
    await prisma.$disconnect();
  });

  describe("GET /api/patients", () => {
    it("returns patients with standardized response and pagination", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("patients");
      expect(res.body.data).toHaveProperty("pagination");
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.patients).toHaveLength(2);
    });

    it("filters patients by search query", async () => {
      const res = await request(app)
        .get("/api/patients?search=alpha")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients).toHaveLength(1);
      expect(res.body.data.patients[0].name).toBe("Patient Alpha");
    });

    it("filters patients by gender", async () => {
      const res = await request(app)
        .get("/api/patients?gender=Female")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients).toHaveLength(1);
      expect(res.body.data.patients[0].gender).toBe("Female");
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/patients");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/patients/:id", () => {
    it("returns patient details with appointments and standardized response", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA.id}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.patient.id).toBe(patientA.id);
      expect(res.body.data.patient.appointments).toHaveLength(1);
      expect(res.body.data.patient.appointments[0].doctor).toHaveProperty("name");
    });

    it("returns 404 for unknown patient", async () => {
      const res = await request(app)
        .get("/api/patients/does-not-exist")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Patient not found");
    });

    it("requires authentication", async () => {
      const res = await request(app).get(`/api/patients/${patientA.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/patients", () => {
    it("creates a patient with validated data", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          name: "Patient Gamma",
          email: "gamma@example.com",
          phoneNumber: "+1 (555) 000-3333",
          age: "41",
          gender: "Other",
          medicalHistory: "Hypertension",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.patient.name).toBe("Patient Gamma");
      expect(res.body.data.patient.phoneNumber).toBe("+15550003333");
      expect(res.body.data.patient.age).toBe(41);
    });

    it("rejects invalid phone numbers", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          name: "Bad Phone",
          phoneNumber: "abc",
          age: "30",
          gender: "Male",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phone/i);
    });

    it("rejects invalid ages", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          name: "Bad Age",
          phoneNumber: "+15550004444",
          age: "999",
          gender: "Male",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Age must be between 0 and 150/i);
    });

    it("rejects invalid email formats", async () => {
      const res = await request(app)
        .post("/api/patients")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          name: "Bad Email",
          email: "invalid-email",
          phoneNumber: "+15550005555",
          age: "34",
          gender: "Male",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it("requires authentication", async () => {
      const res = await request(app).post("/api/patients").send({
        name: "Patient Gamma",
        phoneNumber: "+15550003333",
        age: "41",
        gender: "Other",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/patients/:id", () => {
    it("allows admins to delete patients", async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientA.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.message).toMatch(/Successfully deleted patient/);
    });

    it("rejects non-admin users from deleting patients", async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientA.id}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for missing patients", async () => {
      const res = await request(app)
        .delete("/api/patients/does-not-exist")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Patient not found");
    });
  });
});
