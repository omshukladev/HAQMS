const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// List all appointments with patient and doctor details
router.get("/", authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // BUG FIXED: Added pagination to prevent loading all appointments
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    // BUG FIXED: N+1 Query - use include instead of looping through each appointment
    // Old code did 1 query for appointments + 2N queries for patient/doctor (N=appointments)
    // Now uses Prisma include to fetch everything in a single query
    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appointmentDate: "asc" },
        include: {
          patient: {
            select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true },
          },
          doctor: {
            select: { id: true, name: true, specialization: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({
      status: "success",
      data: {
        appointments,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    console.error("appointments.list error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/appointments
// Book an appointment
router.post("/", authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: "Patient, Doctor, and Appointment Date are required." });
    }

    // BUG FIXED: Round appointment date to minute granularity to prevent millisecond bypass
    // Old code checked exact millisecond match, so 10:00:00 and 10:00:01 both went through
    const appDate = new Date(appointmentDate);
    appDate.setSeconds(0, 0);

    // BUG FIXED: Duplicate check now uses rounded date + the schema's @@unique constraint catches any edge cases
    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: appDate,
        status: { not: "CANCELLED" },
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: "Doctor already has an appointment at this time.",
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || "",
        status: "PENDING",
      },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        appointmentDate: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.status(201).json({
      status: "success",
      data: { appointment },
    });
  } catch (error) {
    console.error("appointments.create error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/appointments/:id
// Update appointment status (PENDING -> COMPLETED / CANCELLED)
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // BUG FIXED: Validate status is a valid enum value
    const validStatuses = ["PENDING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be one of: PENDING, COMPLETED, CANCELLED",
      });
    }

    // BUG FIXED: Check appointment exists before updating
    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        appointmentDate: true,
        reason: true,
        status: true,
        updatedAt: true,
      },
    });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({ status: "success", data: { appointment: updated } });
  } catch (error) {
    console.error("appointments.update error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
