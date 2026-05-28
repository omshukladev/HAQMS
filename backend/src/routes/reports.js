const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Returns aggregate stats for all doctors
router.get("/doctor-stats", authenticate, async (req, res) => {
  try {
    // BUG FIXED: Fetch only needed doctor fields instead of all fields
    const doctors = await prisma.doctor.findMany({
      select: {
        id: true,
        name: true,
        specialization: true,
        department: true,
        consultationFee: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // BUG FIXED: Parallelize all doctor queries using Promise.all instead of nested sequential loop
    // Old code ran 5 sequential queries per doctor with an 80ms sleep between each
    // Now all doctors' stats are gathered in parallel
    const reportData = await Promise.all(
      doctors.map(async (doc) => {
        // BUG FIXED: Parallelize the 4 independent queries for each doctor
        const [totalAppointments, completedAppointments, cancelledAppointments, queueTokensCount] =
          await Promise.all([
            prisma.appointment.count({
              where: { doctorId: doc.id },
            }),
            prisma.appointment.count({
              where: { doctorId: doc.id, status: "COMPLETED" },
            }),
            prisma.appointment.count({
              where: { doctorId: doc.id, status: "CANCELLED" },
            }),
            // BUG FIXED: Use queueDate instead of createdAt to match schema
            prisma.queueToken.count({
              where: { doctorId: doc.id, queueDate: today },
            }),
          ]);

        // BUG FIXED: Use count * fee instead of loading all appointments to calculate revenue
        const revenue = completedAppointments * doc.consultationFee;

        return {
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          department: doc.department,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize: queueTokensCount,
          revenue,
        };
      }),
    );

    // BUG FIXED: Standardized response format matching auth.js pattern
    res.json({
      status: "success",
      data: { doctors: reportData },
    });
  } catch (error) {
    console.error("reports.doctorStats error:", error);
    // BUG FIXED: Removed error.message leak - return generic message only
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
