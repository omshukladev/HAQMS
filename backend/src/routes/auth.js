const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "RECEPTIONIST",
      },
    });

    // Generate token for newly registered user
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || "7h" },
    );

    // Bug fix : removed the hash and password as will as fix the format of response
    res.status(201).json({
      status: "success",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    //bug fix: Added error logging for debugging purposes,
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Server error during registration",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    // Bug fix: removed password from the the console
    console.log(`[AUTH] Login attempt for email: ${req.body.email}`);

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Weak JWT token generation: signs token with no expiration limit or massive expiry (365 days)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || "7h" },
    );

    // Bug fix: same response format as registration and removed the password hash from the response
    res.status(201).json({
      status: "success",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    // Bug fix: removed stack error from the response for security reasons
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/auth/me
// Returns current user details based on JWT
const { authenticate } = require("../middleware/auth");
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Bug fix: same response format as registration and login
    res.status(201).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Me route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
