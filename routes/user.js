import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs"; // Changed from bcrypt to bcryptjs

// Helper function to sanitize user data
const sanitizeUserData = (user) => ({
  _id: user.id || uuidv4(),
  branchId: user.branchId || null,
  name: user.name || "",
  email: user.email || "",
  role: user.role || "user",
  branchName: user.branchName || "",
  branchPhone: user.branchPhone || null,
  branchLocation: user.branchLocation || "",
  permissions: user.permissions || {},
  password: user.password || null, // Only included if explicitly set
  createdAt: user.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Permissions object based on role
const createPermissionsObject = (role) => {
  const basePermissions = {
    user: { canCreateUser: false, canEditUser: false, canDeleteUser: false, canViewUsers: false },
    branch: { canViewBranches: false, canCreateBranch: false, canEditBranch: false, canDeleteBranch: false },
    department: { canViewDepartments: false, canCreateDepartment: false, canEditDepartment: false, canDeleteDepartment: false },
    categories: { canViewCategories: false, canEditCategory: false, canDeleteCategories: false },
    inventory: {
      canViewInventory: false,
      canCreateItem: false,
      canSetSellingPrice: false,
      canSetCostPrice: false,
      canViewInstock: false,
      canEditItem: false,
      canDeleteItem: false,
      canViewSingleBranchInventory: false,
      canCheckInventory: false,
    },
    pos: { canMakeSales: false },
    transaction: { canViewTransactions: false, canMakeReturn: false },
    return: { canViewReturn: false },
    waybill: { canSendItem: false, canAcceptItem: false, canViewWaybills: false },
    report: {
      canViewFinancialReport: false,
      canViewBranchReport: false,
      canCreateBranchReport: false,
      canEditBranchReport: false,
      canDeleteBranchReport: false,
      canCreateExpensesReport: false,
      canViewExpensesReport: false,
      canEditExpensesReport: false,
      canDeleteExpensesReport: false,
    },
    logs: { canViewLogs: false },
    setting: { canViewSetting: false, canGivePermission: false, canSetThresholds: false },
  };

  role = role.toLowerCase();
  if (role === "general-manager") {
    for (const category in basePermissions) {
      for (const permission in basePermissions[category]) {
        basePermissions[category][permission] = true;
      }
    }
  } else if (role === "manager") {
    basePermissions.inventory.canViewInventory = true;
    basePermissions.inventory.canCheckInventory = true;
    basePermissions.transaction.canViewTransactions = true;
    basePermissions.transaction.canMakeReturn = true;
    basePermissions.return.canViewReturn = true;
    basePermissions.report.canViewBranchReport = true;
    basePermissions.report.canCreateBranchReport = true;
    basePermissions.report.canEditBranchReport = true;
    basePermissions.report.canDeleteBranchReport = true;
    basePermissions.report.canCreateExpensesReport = true;
    basePermissions.report.canViewExpensesReport = true;
    basePermissions.report.canEditExpensesReport = true;
    basePermissions.report.canDeleteExpensesReport = true;
  } else if (role === "cashier") {
    basePermissions.transaction.canViewTransactions = true;
    basePermissions.transaction.canMakeReturn = true;
    basePermissions.return.canViewReturn = true;
  }

  return basePermissions;
};

// Hash password helper
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds); // bcryptjs usage remains the same as bcrypt
};

// Fastify plugin export
export default async function userRoutes(fastify, options) {
  // GET - Fetch all users
  fastify.get("/", async (req, reply) => {
    const db = req.pouchDB;

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });

      const users = result.rows.map((row) => ({
        id: row.doc._id,
        branchId: row.doc.branchId,
        name: row.doc.name,
        email: row.doc.email,
        role: row.doc.role,
        branchName: row.doc.branchName,
        branchPhone: row.doc.branchPhone,
        branchLocation: row.doc.branchLocation,
        permissions: row.doc.permissions,
        createdAt: row.doc.createdAt,
        updatedAt: row.doc.updatedAt,
      }));

      return reply.send(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return reply.status(500).send({
        message: "Error fetching users",
        error: error.message,
      });
    }
  });

// POST - Create a user
fastify.post("/create", async (req, reply) => {
  const db = req.pouchDB;
  const userData = req.body;

  if (!userData.email || !userData.password || !userData.branchId) {
    return reply.status(400).send({ message: "Email, password, and branchId are required" });
  }

  try {
    const allowedRoles = ["Manager", "Cashier"];
    if (userData.role && !allowedRoles.includes(userData.role)) {
      return reply.status(400).send({ message: `Role must be one of: ${allowedRoles.join(", ")}` });
    }

    // Fetch branch directly from PouchDB instead of HTTP request
    let branch;
    try {
      branch = await db.get(userData.branchId);
    } catch (err) {
      if (err.name === 'not_found') {
        return reply.status(400).send({ message: "Invalid branch ID" });
      }
      throw err;
    }

    const result = await db.allDocs({
      include_docs: true,
      attachments: false,
    });
    const existingUser = result.rows.map((row) => row.doc).find((u) => u.email === userData.email);
    if (existingUser) {
      return reply.status(400).send({ message: "Email already exists" });
    }

    const hashedPassword = await hashPassword(userData.password);
    const permissions = createPermissionsObject(userData.role || "Cashier");
    const sanitizedData = sanitizeUserData({
      ...userData,
      id: uuidv4(),
      permissions,
      password: hashedPassword,
      branchName: branch.branchName,
      branchPhone: branch.phone,
      branchLocation: branch.location,
    });

    const response = await db.put(sanitizedData);

    return reply.send({
      message: "User created successfully",
      userId: sanitizedData._id,
      rev: response.rev,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return reply.status(500).send({
      message: "Error creating user",
      error: error.message,
    });
  }
});

  // PUT - Update a user
  fastify.put("/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;
    const userData = req.body;

    if (!id || !userData.branchId) {
      return reply.status(400).send({ message: "User ID and Branch ID are required" });
    }

    try {
      if (userData.role) {
        const allowedRoles = ["Manager", "Cashier"];
        if (!allowedRoles.includes(userData.role)) {
          return reply.status(400).send({ message: `Role must be one of: ${allowedRoles.join(", ")}` });
        }
      }

      const doc = await db.get(id);
      const sanitizedData = sanitizeUserData({
        ...doc,
        ...userData,
        permissions: userData.role ? createPermissionsObject(userData.role) : doc.permissions,
      });

      if (userData.password) {
        sanitizedData.password = await hashPassword(userData.password);
      }

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "User updated successfully",
        userId: id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return reply.status(500).send({
        message: "Error updating user",
        error: error.message,
      });
    }
  });

  // DELETE - Delete a user
  fastify.delete("/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;

    try {
      const doc = await db.get(id);
      const response = await db.remove(doc);

      return reply.send({
        message: "User deleted successfully",
        userId: id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return reply.status(500).send({
        message: "Error deleting user",
        error: error.message,
      });
    }
  });

  // POST - Create a manager
  fastify.post("/managers/create", async (req, reply) => {
    const db = req.pouchDB;
    const managerData = req.body;

    if (!managerData.email || !managerData.password) {
      return reply.status(400).send({ message: "Email and password are required" });
    }

    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: false,
      });
      const existingUser = result.rows.map((row) => row.doc).find((u) => u.email === managerData.email);
      if (existingUser) {
        return reply.status(400).send({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(managerData.password);
      const permissions = createPermissionsObject("General-Manager");
      const sanitizedData = sanitizeUserData({
        ...managerData,
        id: uuidv4(),
        role: "General-Manager",
        permissions,
        password: hashedPassword,
      });

      const response = await db.put(sanitizedData);

      return reply.send({
        message: "Manager created successfully",
        userId: sanitizedData._id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error creating manager:", error);
      return reply.status(500).send({
        message: "Error creating manager",
        error: error.message,
      });
    }
  });

  // PUT - Update a manager
  fastify.put("/managers/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;
    const managerData = req.body;

    if (!id) {
      return reply.status(400).send({ message: "Manager ID is required" });
    }

    try {
      const doc = await db.get(id);
      const sanitizedData = sanitizeUserData({
        ...doc,
        ...managerData,
        role: "General-Manager",
        permissions: doc.permissions, // Preserve permissions unless explicitly changed
      });

      if (managerData.password) {
        sanitizedData.password = await hashPassword(managerData.password);
      }

      const response = await db.put({ ...sanitizedData, _rev: doc._rev });

      return reply.send({
        message: "Manager updated successfully",
        userId: id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error updating manager:", error);
      return reply.status(500).send({
        message: "Error updating manager",
        error: error.message,
      });
    }
  });

  // DELETE - Delete a manager
  fastify.delete("/managers/:id", async (req, reply) => {
    const db = req.pouchDB;
    const { id } = req.params;

    try {
      const doc = await db.get(id);
      const response = await db.remove(doc);

      return reply.send({
        message: "Manager deleted successfully",
        managerId: id,
        rev: response.rev,
      });
    } catch (error) {
      console.error("Error deleting manager:", error);
      return reply.status(500).send({
        message: "Error deleting manager",
        error: error.message,
      });
    }
  });

  // POST - Sync with remote CouchDB
  fastify.post("/sync", async (req, reply) => {
    const localDB = req.pouchDB;
    const remoteURL = req.couchDBUrl;

    try {
      const remoteDB = new PouchDB(remoteURL, {
        auth: {
          username: req.couchDBUsername || "admin",
          password: req.couchDBPassword || "password",
        },
      });

      const syncResult = await localDB.sync(remoteDB, {
        live: false,
        retry: true,
      });

      return reply.send({
        message: "Sync completed successfully",
        pushed: syncResult.push?.docs_written || 0,
        pulled: syncResult.pull?.docs_written || 0,
      });
    } catch (error) {
      console.error("Error syncing with remote CouchDB:", error);
      return reply.status(500).send({
        message: "Error syncing with remote CouchDB",
        error: error.message,
      });
    }
  });
}