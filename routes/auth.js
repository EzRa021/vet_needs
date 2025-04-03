import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Helper function to compare passwords
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Fastify plugin export
export default async function (fastify, opts) {
  // POST - Login route
  fastify.post("/login", async (req, reply) => {
    const { email, password } = req.body;
    const db = req.pouchDB;

    if (!email || !password) {
      return reply.status(400).send({ message: "Email and password are required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const user = result.rows
        .map((row) => row.doc)
        .find((u) => u.email === email);

      if (!user) {
        return reply.status(401).send({ message: "Invalid email or password" });
      }

      const passwordMatch = await comparePassword(password, user.password);
      if (!passwordMatch) {
        return reply.status(401).send({ message: "Invalid email or password" });
      }

      const userData = {
        uid: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        branchId: user.branchId || null,
        permissions: user.permissions || {},
      };

      return reply.status(200).send({
        message: "Login successful",
        user: userData,
      });
    } catch (error) {
      console.error("Login error:", error);
      return reply.status(500).send({
        message: error.message || "Login failed. Please try again.",
      });
    }
  });

  // POST - Register route
  fastify.post("/register", async (req, reply) => {
    const { email, password, fullname, role } = req.body;
    const db = req.pouchDB;

    if (!email || !password || !fullname || !role) {
      return reply.status(400).send({
        message: "Email, password, fullname, and role are required",
      });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const existingUser = result.rows
        .map((row) => row.doc)
        .find((u) => u.email === email);

      if (existingUser) {
        return reply.status(400).send({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);
      const userDoc = {
        _id: uuidv4(),
        email,
        password: hashedPassword,
        fullname,
        role,
        createdAt: new Date().toISOString(),
      };

      const response = await db.put(userDoc);

      const userData = {
        uid: userDoc._id,
        email,
        fullname,
        role,
      };

      return reply.status(201).send({
        message: "Registration successful",
        user: userData,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return reply.status(500).send({
        message: error.message || "Registration failed. Please try again.",
      });
    }
  });

  // POST - Logout route (client-side handling)
  fastify.post("/logout", async (req, reply) => {
    return reply.status(200).send({ message: "Logout successful" });
  });
}