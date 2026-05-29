const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// Retrieve list of doctors with search and specialization filtering
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    // BUG FIXED: Added input validation for search term length
    if (search && String(search).length > 100) {
      return res.status(400).json({ error: "Search term too long" });
    }

    // BUG FIXED: Added pagination to prevent loading all doctors
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    const where = {};

    // BUG FIXED: SQL Injection - replaced queryRawUnsafe with safe Prisma filters
    if (search) {
      where.name = { contains: String(search), mode: "insensitive" };
    }

    if (specialization && specialization !== "All") {
      where.specialization = String(specialization);
    }

    // BUG FIXED: Performance - parallelize count and findMany using Promise.all
    const [total, doctors] = await Promise.all([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
        where,
        take: limit,
        skip: skip || 0,
        orderBy: { name: "asc" },
        // BUG FIXED: Use select to return only safe fields, not entire object
        select: {
          id: true,
          userId: true,
          name: true,
          specialization: true,
          department: true,
          consultationFee: true,
          experience: true,
          availableFrom: true,
          availableTo: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({
      status: "success",
      data: {
        doctors,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    console.error("doctors.list error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/doctors/stats
// Returns aggregation details about available doctors
router.get("/stats", authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // BUG FIXED: Performance - parallelize independent queries using Promise.all instead of sequential await
    const [totalDoctors, surgeonsCount, averageFee, highestExperience] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({
        where: { department: "Surgery" },
      }),
      prisma.doctor.aggregate({
        _avg: {
          consultationFee: true,
        },
      }),
      prisma.doctor.aggregate({
        _max: {
          experience: true,
        },
      }),
    ]);

    const durationMs = Date.now() - start;

    // BUG FIXED: Standardized response format matching auth.js pattern (status: success)
    res.json({
      status: "success",
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFee._avg.consultationFee || 0),
        maxExperience: highestExperience._max.experience || 0,
        executionTimeMs: durationMs,
      },
    });
  } catch (error) {
    console.error("doctors.stats error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/doctors/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    // BUG FIXED: Use select to return only safe fields, not entire object
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        name: true,
        specialization: true,
        department: true,
        consultationFee: true,
        experience: true,
        availableFrom: true,
        availableTo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({ status: "success", data: doctor });
  } catch (error) {
    console.error("doctors.getById error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
