import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import cors from "cors";
import request from "supertest";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let app;
let queueRouter;
let testToken;
let doctorA;
let doctorB;
let patientA;
let patientB;

function startOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

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
  testApp.use("/api/queue", queueRouter);

  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Queue Routes", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-queue-secret";

    const mod = await import("../src/routes/queue.js");
    queueRouter = mod.default ?? mod;

    app = createTestApp();

    testToken = jwt.sign(
      { id: "queue-test-user", email: "queue@example.com", role: "RECEPTIONIST" },
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
        name: "Dr. Queue One",
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
        name: "Dr. Queue Two",
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
        name: "Queue Patient A",
        phoneNumber: "1111111111",
        age: 30,
        gender: "Male",
        email: "queue-a@example.com",
      },
    });

    patientB = await prisma.patient.create({
      data: {
        name: "Queue Patient B",
        phoneNumber: "2222222222",
        age: 28,
        gender: "Female",
        email: "queue-b@example.com",
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

  describe("GET /api/queue", () => {
    it("returns only today's tokens with safe fields and pagination", async () => {
      const today = startOfDay();
      const yesterday = startOfDay(new Date(Date.now() - 86400000));

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
          {
            tokenNumber: 3,
            queueDate: yesterday,
            patientId: patientA.id,
            doctorId: doctorA.id,
            status: "WAITING",
          },
        ],
      });

      const res = await request(app)
        .get("/api/queue")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(50);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.tokens).toHaveLength(2);
      expect(res.body.data.tokens[0].patient).toHaveProperty("name");
      expect(res.body.data.tokens[0].patient).not.toHaveProperty("email");
      expect(res.body.data.tokens[0].doctor).toHaveProperty("specialization");
      expect(res.body.data.tokens[0].doctor).not.toHaveProperty("userId");
    });

    it("filters tokens by doctorId", async () => {
      const today = startOfDay();

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
            status: "WAITING",
          },
        ],
      });

      const res = await request(app)
        .get(`/api/queue?doctorId=${doctorA.id}`)
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tokens).toHaveLength(1);
      expect(res.body.data.tokens[0].doctor.id).toBe(doctorA.id);
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/queue");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Access denied. No token provided.");
    });
  });

  describe("POST /api/queue/checkin", () => {
    it("creates the first token for a doctor and returns standardized response", async () => {
      const res = await request(app)
        .post("/api/queue/checkin")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientA.id,
          doctorId: doctorA.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.token.tokenNumber).toBe(1);
      expect(res.body.data.token.status).toBe("WAITING");
      expect(res.body.data.token.patient.id).toBe(patientA.id);
      expect(res.body.data.token.doctor.id).toBe(doctorA.id);
    });

    it("increments token numbers on repeated check-ins for the same doctor", async () => {
      const first = await request(app)
        .post("/api/queue/checkin")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientA.id,
          doctorId: doctorA.id,
        });

      const second = await request(app)
        .post("/api/queue/checkin")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          patientId: patientB.id,
          doctorId: doctorA.id,
        });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.data.token.tokenNumber).toBe(1);
      expect(second.body.data.token.tokenNumber).toBe(2);
    });

    it("rejects missing patient or doctor IDs", async () => {
      const res = await request(app)
        .post("/api/queue/checkin")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ patientId: patientA.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Patient and Doctor ID are required for check-in.");
    });

    it("requires authentication", async () => {
      const res = await request(app)
        .post("/api/queue/checkin")
        .send({ patientId: patientA.id, doctorId: doctorA.id });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/queue/:id", () => {
    it("updates a token through valid status transitions", async () => {
      const token = await prisma.queueToken.create({
        data: {
          tokenNumber: 1,
          queueDate: startOfDay(),
          patientId: patientA.id,
          doctorId: doctorA.id,
          status: "WAITING",
        },
      });

      const calling = await request(app)
        .patch(`/api/queue/${token.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "CALLING" });

      expect(calling.status).toBe(200);
      expect(calling.body.status).toBe("success");
      expect(calling.body.data.token.status).toBe("CALLING");

      const completed = await request(app)
        .patch(`/api/queue/${token.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "COMPLETED" });

      expect(completed.status).toBe(200);
      expect(completed.body.data.token.status).toBe("COMPLETED");
    });

    it("rejects invalid status values", async () => {
      const token = await prisma.queueToken.create({
        data: {
          tokenNumber: 1,
          queueDate: startOfDay(),
          patientId: patientA.id,
          doctorId: doctorA.id,
          status: "WAITING",
        },
      });

      const res = await request(app)
        .patch(`/api/queue/${token.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "BROKEN" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid status/i);
    });

    it("rejects invalid status transitions", async () => {
      const token = await prisma.queueToken.create({
        data: {
          tokenNumber: 1,
          queueDate: startOfDay(),
          patientId: patientA.id,
          doctorId: doctorA.id,
          status: "WAITING",
        },
      });

      const res = await request(app)
        .patch(`/api/queue/${token.id}`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "COMPLETED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot transition from WAITING to COMPLETED/);
    });

    it("returns 404 when the token does not exist", async () => {
      const res = await request(app)
        .patch("/api/queue/does-not-exist")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ status: "CALLING" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Queue token not found");
    });

    it("requires authentication", async () => {
      const token = await prisma.queueToken.create({
        data: {
          tokenNumber: 1,
          queueDate: startOfDay(),
          patientId: patientA.id,
          doctorId: doctorA.id,
          status: "WAITING",
        },
      });

      const res = await request(app)
        .patch(`/api/queue/${token.id}`)
        .send({ status: "CALLING" });

      expect(res.status).toBe(401);
    });
  });
});
