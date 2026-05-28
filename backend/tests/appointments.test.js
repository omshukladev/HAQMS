import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import cors from "cors";
import request from "supertest";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let app;
let appointmentRouter;
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
  testApp.use("/api/appointments", appointmentRouter);

  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Appointment Routes", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-appointments-secret";

    const mod = await import("../src/routes/appointments.js");
    appointmentRouter = mod.default ?? mod;

    app = createTestApp();

    testToken = jwt.sign(
      { id: "appointments-test-user", email: "appointments@example.com", role: "RECEPTIONIST" },
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
        name: "Dr. Appointment One",
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
        name: "Dr. Appointment Two",
        specialization: "Neurology",
        department: "Medicine",
        consultationFee: 650,
        experience: 15,
        availableFrom: "10:00",
        availableTo: "18:00",
      },
    });

    patientA = await prisma.patient.create({
      data: {
        name: "Appointment Patient A",
        phoneNumber: "3333333333",
        age: 30,
        gender: "Male",
        email: "appointment-a@example.com",
        medicalHistory: "Diabetes",
      },
    });

    patientB = await prisma.patient.create({
      data: {
        name: "Appointment Patient B",
        phoneNumber: "4444444444",
        age: 28,
        gender: "Female",
        email: "appointment-b@example.com",
        medicalHistory: "Asthma",
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

  describe("GET /api/appointments", () => {
    it("returns appointments with patient and doctor details", async () => {
      await prisma.appointment.createMany({
        data: [
          {
            patientId: patientA.id,
            doctorId: doctorA.id,
            appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
            reason: "Checkup",
            status: "PENDING",
          },
          {
            patientId: patientB.id,
            doctorId: doctorB.id,
            appointmentDate: new Date("2026-05-28T11:00:00.000Z"),
            reason: "Follow up",
            status: "COMPLETED",
          },
        ],
      });

      const res = await request(app)
        .get("/api/appointments")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.appointments).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.appointments[0].patient).toHaveProperty("name");
      expect(res.body.data.appointments[0].doctor).toHaveProperty("name");
    });

    it("supports filtering by doctorId", async () => {
      await prisma.appointment.createMany({
        data: [
          {
            patientId: patientA.id,
            doctorId: doctorA.id,
            appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
            reason: "Checkup",
            status: "PENDING",
          },
          {
            patientId: patientB.id,
            doctorId: doctorB.id,
            appointmentDate: new Date("2026-05-28T11:00:00.000Z"),
            reason: "Follow up",
            status: "PENDING",
          },
        ],
      });

      const res = await request(app)
        .get(`/api/appointments?doctorId=${doctorA.id}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(1);
      expect(res.body.data.appointments[0].doctorId).toBe(doctorA.id);
    });

    it("supports pagination", async () => {
      await prisma.appointment.createMany({
        data: [
          {
            patientId: patientA.id,
            doctorId: doctorA.id,
            appointmentDate: new Date("2026-05-28T08:00:00.000Z"),
            reason: "A",
            status: "PENDING",
          },
          {
            patientId: patientB.id,
            doctorId: doctorA.id,
            appointmentDate: new Date("2026-05-28T09:00:00.000Z"),
            reason: "B",
            status: "PENDING",
          },
          {
            patientId: patientA.id,
            doctorId: doctorB.id,
            appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
            reason: "C",
            status: "PENDING",
          },
        ],
      });

      const res = await request(app)
        .get("/api/appointments?page=1&limit=2")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/appointments");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/appointments", () => {
    it("books an appointment and returns standardized response", async () => {
      const res = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: "2026-05-28T10:15:45.000Z",
          reason: "Checkup",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.appointment).toHaveProperty("id");
      expect(res.body.data.appointment.status).toBe("PENDING");
      expect(res.body.data.appointment.appointmentDate).toContain("2026-05-28T10:15:00");
    });

    it("blocks duplicate bookings at the same rounded minute", async () => {
      const first = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: "2026-05-28T10:15:45.000Z",
          reason: "Checkup",
        });

      const second = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientB.id,
          doctorId: doctorA.id,
          appointmentDate: "2026-05-28T10:15:05.000Z",
          reason: "Follow up",
        });

      expect(first.status).toBe(201);
      expect(second.status).toBe(400);
      expect(second.body.error).toMatch(/Doctor already has an appointment/i);
    });

    it("rejects missing required fields", async () => {
      const res = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientA.id,
          doctorId: doctorA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it("requires authentication", async () => {
      const res = await request(app).post("/api/appointments").send({
        patientId: patientA.id,
        doctorId: doctorA.id,
        appointmentDate: "2026-05-28T10:15:45.000Z",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/appointments/:id", () => {
    it("updates an appointment status with success response", async () => {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
          reason: "Checkup",
          status: "PENDING",
        },
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "COMPLETED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.appointment.status).toBe("COMPLETED");
    });

    it("rejects invalid status values", async () => {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
          reason: "Checkup",
          status: "PENDING",
        },
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "BROKEN" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid status/i);
    });

    it("returns 404 for unknown appointments", async () => {
      const res = await request(app)
        .patch("/api/appointments/does-not-exist")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "COMPLETED" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Appointment not found");
    });

    it("requires authentication", async () => {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientA.id,
          doctorId: doctorA.id,
          appointmentDate: new Date("2026-05-28T10:00:00.000Z"),
          reason: "Checkup",
          status: "PENDING",
        },
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment.id}`)
        .send({ status: "COMPLETED" });

      expect(res.status).toBe(401);
    });
  });
});
