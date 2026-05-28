const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// List queue tokens with optional filtering and pagination
router.get("/", authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    // BUG FIXED: Default filter to today's queue instead of returning all historical data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where = { queueDate: today };
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // BUG FIXED: Added pagination to prevent loading unlimited tokens
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const skip = (page - 1) * limit;

    // BUG FIXED: Parallelize count and findMany using Promise.all
    const [total, tokens] = await Promise.all([
      prisma.queueToken.count({ where }),
      prisma.queueToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tokenNumber: "asc" },
        // BUG FIXED: Use select instead of include to return only safe fields
        select: {
          id: true,
          tokenNumber: true,
          queueDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: { id: true, name: true, phoneNumber: true },
          },
          doctor: {
            select: { id: true, name: true, specialization: true, department: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({
      status: "success",
      data: {
        tokens,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    console.error("queue.list error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/queue/checkin
// Generate a new queue token for a patient
router.post("/checkin", authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: "Patient and Doctor ID are required for check-in." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // BUG FIXED: Race condition - moved read and create into a transaction for atomic token generation
    const newToken = await prisma.$transaction(async (tx) => {
      const maxTokenResult = await tx.queueToken.aggregate({
        where: { doctorId, queueDate: today },
        _max: { tokenNumber: true },
      });

      const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

      return tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          queueDate: today,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          status: "WAITING",
        },
        select: {
          id: true,
          tokenNumber: true,
          queueDate: true,
          status: true,
          createdAt: true,
          patient: {
            select: { id: true, name: true, phoneNumber: true },
          },
          doctor: {
            select: { id: true, name: true, specialization: true },
          },
        },
      });
    });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.status(201).json({
      status: "success",
      data: { token: newToken },
    });
  } catch (error) {
    console.error("queue.checkin error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/queue/:id
// Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // BUG FIXED: Validate status is a valid enum value
    const validStatuses = ["WAITING", "CALLING", "COMPLETED", "SKIPPED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be one of: WAITING, CALLING, COMPLETED, SKIPPED",
      });
    }

    // BUG FIXED: Check token exists before updating
    const existingToken = await prisma.queueToken.findUnique({
      where: { id: req.params.id },
    });

    if (!existingToken) {
      return res.status(404).json({ error: "Queue token not found" });
    }

    // BUG FIXED: Validate status transition (WAITING->CALLING/SKIPPED, CALLING->COMPLETED only)
    const allowedTransitions = {
      WAITING: ["CALLING", "SKIPPED"],
      CALLING: ["COMPLETED"],
    };
    const allowed = allowedTransitions[existingToken.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${existingToken.status} to ${status}`,
      });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      select: {
        id: true,
        tokenNumber: true,
        queueDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: { id: true, name: true, phoneNumber: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({ status: "success", data: { token: updatedToken } });
  } catch (error) {
    console.error("queue.update error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
