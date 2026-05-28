const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/patients
// Get all patients with search, filtering, and pagination
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;

    // BUG FIXED: Moved search and filter to Prisma query instead of in-memory
    // Old code loaded ALL patients then filtered in JS - terrible for scale
    const where = {};

    if (search) {
      const query = String(search);
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phoneNumber: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    if (gender && gender !== "All") {
      where.gender = { equals: gender, mode: "insensitive" };
    }

    // BUG FIXED: Added database-level pagination instead of in-memory slice
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    // BUG FIXED: Parallelize count and findMany using Promise.all
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        // BUG FIXED: Use select to return only safe fields
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          age: true,
          gender: true,
          medicalHistory: true,
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
        patients,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (error) {
    console.error("patients.list error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/patients/:id
// Get patient details by ID with their appointments and queue tokens
router.get("/:id", authenticate, async (req, res) => {
  try {
    // BUG FIXED: Use select instead of include to return only safe appointment fields
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        age: true,
        gender: true,
        medicalHistory: true,
        createdAt: true,
        updatedAt: true,
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            reason: true,
            status: true,
            doctor: {
              select: { id: true, name: true, specialization: true },
            },
          },
          orderBy: { appointmentDate: "desc" },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({ status: "success", data: { patient } });
  } catch (error) {
    console.error("patients.getById error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/patients (Register patient)
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({ error: "Name, phoneNumber, age, and gender are required." });
    }

    // BUG FIXED: Added phone number format validation
    const phoneClean = String(phoneNumber).replace(/[\s-()]/g, "");
    if (!/^\+?\d{7,15}$/.test(phoneClean)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // BUG FIXED: Added age range validation
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      return res.status(400).json({ error: "Age must be between 0 and 150" });
    }

    // BUG FIXED: Basic email format validation if email provided
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber: phoneClean,
        age: ageNum,
        gender,
        medicalHistory: medicalHistory || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        age: true,
        gender: true,
        medicalHistory: true,
        createdAt: true,
      },
    });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.status(201).json({
      status: "success",
      data: { patient },
    });
  } catch (error) {
    console.error("patients.create error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/patients/:id
router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    await prisma.patient.delete({ where: { id } });

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({
      status: "success",
      data: { message: `Successfully deleted patient ${patient.name}` },
    });
  } catch (error) {
    console.error("patients.delete error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
