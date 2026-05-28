import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import cors from "cors";
import request from "supertest";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let app;
let reportsRouter;
let testToken;
let doctorA;
let doctorB;
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
  testApp.use("/api/reports", reportsRouter);

  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Reports Routes", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-reports-secret";

    const mod = await import("../src/routes/reports.js");
    reportsRouter = mod.default ?? mod;

    app = createTestApp();

    testToken = jwt.sign(
      { id: "reports-test-user", email: "reports@example.com", role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  beforeEach(async () => {
    await prisma.queueToken.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.doctor.deleteMany({});

    doctorA = await prisma.doctor.create({
      data: {
        name: "Dr. Report One",
        specialization: "Cardiology",
        department: "Medicine",
        consultationFee: 500,
        experience: 12,
        availableFrom: "09:00",
        availableTo: "17:00",
      },
    });

    doctorB = await prisma.doctor.create({
      data: {
        name: "Dr. Report Two",
        specialization: "Neurology",
        department: "Medicine",
        consultationFee: 700,
        experience: 15,
        availableFrom: "10:00",
        availableTo: "18:00",
      },
    });

    patientA = await prisma.patient.create({
      data: {
        name: "Report Patient A",
        phoneNumber: "5551111111",
        age: 31,
        gender: "Male",
        email: "report-a@example.com",
      },
    });

    patientB = await prisma.patient.create({
      data: {
        name: "Report Patient B",
        phoneNumber: "5552222222",
        age: 29,
        gender: "Female",
        email: "report-b@example.com",
      },
    });

    await prisma.appointment.createMany({
      data: [
        {
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: new Date("2026-05-28T09:00:00.000Z"),
          reason: "Checkup",
          status: "COMPLETED",
        },
        {
          patientId: patientB.id,
          doctorId: doctorA.id,
          appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
          reason: "Follow up",
          status: "CANCELLED",
        },
        {
          patientId: patientA.id,
          doctorId: doctorB.id,
          appointmentDate: new Date("2026-05-28T11:00:00.000Z"),
          reason: "Consult",
          status: "COMPLETED",
        },
      ],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.queueToken.createMany({
      data: [
        {
          tokenNumber: 1,
          queueDate: today,
          patientId: patientA.id,
          doctorId: doctorA.id,
          status: "WAITING",
        },
        {
          tokenNumber: 2,
          queueDate: today,
          patientId: patientB.id,
          doctorId: doctorB.id,
          status: "CALLING",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.queueToken.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.doctor.deleteMany({});
    await prisma.$disconnect();
  });

  describe("GET /api/reports/doctor-stats", () => {
    it("returns standardized report data for all doctors", async () => {
      const res = await request(app)
        .get("/api/reports/doctor-stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.doctors).toHaveLength(2);
      expect(res.body.data.doctors[0]).toHaveProperty("id");
      expect(res.body.data.doctors[0]).toHaveProperty("totalAppointments");
      expect(res.body.data.doctors[0]).toHaveProperty("completedAppointments");
      expect(res.body.data.doctors[0]).toHaveProperty("cancelledAppointments");
      expect(res.body.data.doctors[0]).toHaveProperty("todayQueueSize");
      expect(res.body.data.doctors[0]).toHaveProperty("revenue");
    });

    it("calculates totals for appointments, queue size, and revenue", async () => {
      const res = await request(app)
        .get("/api/reports/doctor-stats")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);

      const doctorOne = res.body.data.doctors.find((d) => d.id === doctorA.id);
      const doctorTwo = res.body.data.doctors.find((d) => d.id === doctorB.id);

      expect(doctorOne.totalAppointments).toBe(2);
      expect(doctorOne.completedAppointments).toBe(1);
      expect(doctorOne.cancelledAppointments).toBe(1);
      expect(doctorOne.todayQueueSize).toBe(1);
      expect(doctorOne.revenue).toBe(500);

      expect(doctorTwo.totalAppointments).toBe(1);
      expect(doctorTwo.completedAppointments).toBe(1);
      expect(doctorTwo.cancelledAppointments).toBe(0);
      expect(doctorTwo.todayQueueSize).toBe(1);
      expect(doctorTwo.revenue).toBe(700);
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/reports/doctor-stats");

      expect(res.status).toBe(401);
    });
  });
});
