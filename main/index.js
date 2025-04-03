import { app, BrowserWindow, ipcMain } from "electron";
import Fastify from "fastify";
import path from "path";
import PouchDB from "pouchdb-node";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";
const appRoot = isDev ? path.join(__dirname, "..") : app.getAppPath();
const PORT = 8000;
global.serverPort = PORT;

// CouchDB configuration
const COUCHDB_URL_BRANCHES = "http://localhost:5984/branches";
const COUCHDB_URL_DEPARTMENTS = "http://localhost:5984/departments";
const COUCHDB_URL_CATEGORIES = "http://localhost:5984/categories";
const COUCHDB_URL_ITEMS = "http://localhost:5984/items";
const COUCHDB_URL_TRANSACTIONS = "http://localhost:5984/transactions";
const COUCHDB_URL_RETURNS = "http://localhost:5984/returns";
const COUCHDB_URL_USERS = "http://localhost:5984/users";
const COUCHDB_URL_EXPENSES = "http://localhost:5984/expenses";
const COUCHDB_URL_REPORTS = "http://localhost:5984/reports";
const COUCHDB_URL_LOGS = "http://localhost:5984/logs";
const COUCHDB_URL_INVENTORY_CHECKS = "http://localhost:5984/inventoryChecks";
const COUCHDB_USERNAME = "Quantum";
const COUCHDB_PASSWORD = "Horlamidey11.";

let mainWindow;
let fastifyServer;

// Setup PouchDB with separate databases
const setupPouchDB = () => {
  console.log("Setting up PouchDB databases...");
  try {
    const dbPath = path.join(app.getPath("userData"), "databases");
    if (!existsSync(dbPath)) {
      console.log(`Creating database directory: ${dbPath}`);
      mkdirSync(dbPath, { recursive: true });
    }

    return {
      branchesDB: new PouchDB(path.join(dbPath, "branches")),
      departmentsDB: new PouchDB(path.join(dbPath, "departments")),
      categoriesDB: new PouchDB(path.join(dbPath, "categories")),
      itemsDB: new PouchDB(path.join(dbPath, "items")),
      transactionsDB: new PouchDB(path.join(dbPath, "transactions")),
      returnsDB: new PouchDB(path.join(dbPath, "returns")),
      usersDB: new PouchDB(path.join(dbPath, "users")),
      expensesDB: new PouchDB(path.join(dbPath, "expenses")),
      reportsDB: new PouchDB(path.join(dbPath, "reports")),
      logsDB: new PouchDB(path.join(dbPath, "logs")),
      inventoryChecksDB: new PouchDB(path.join(dbPath, "inventoryChecks")),
    };
  } catch (error) {
    console.error("Error setting up PouchDB:", error);
    throw error;
  }
};

// Fastify server setup
const createFastifyServer = async () => {
  console.log("Creating Fastify server...");
  try {

    // With this simpler configuration:
    const fastify = Fastify({
      logger: true
    });

    const databases = setupPouchDB();
    const {
      branchesDB,
      departmentsDB,
      categoriesDB,
      itemsDB,
      transactionsDB,
      returnsDB,
      usersDB,
      expensesDB,
      reportsDB,
      logsDB,
      inventoryChecksDB,
    } = databases;

    fastify.decorateRequest("pouchDB", null);
    fastify.decorateRequest("couchDBUrl", null);
    fastify.decorateRequest("couchDBUsername", { getter: () => COUCHDB_USERNAME });
    fastify.decorateRequest("couchDBPassword", { getter: () => COUCHDB_PASSWORD });

    // CORS configuration
    await fastify.register(import("@fastify/cors"), {
      origin: isDev ? "http://localhost:3000" : `http://localhost:${PORT}`,
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      credentials: true  // Add this line to support credentials
    });

    // Register routes
    try {
      // For ESM modules, we need to use file:// URLs
      // Define the routes directory in the root folder (sibling to main folder)
      const mainDir = path.dirname(__dirname);  // Go up one level from main
      const routesPath = path.join(mainDir, "routes");

      console.log(`Looking for routes at: ${routesPath}`);

      // Check if routes directory exists
      if (!existsSync(routesPath)) {
        throw new Error(`Routes directory not found at ${routesPath}`);
      }

      // Helper function to handle route registration with error handling
      const registerRoute = async (routeName, options) => {
        const routeFile = path.join(routesPath, `${routeName}.js`);

        if (!existsSync(routeFile)) {
          console.warn(`Warning: Route file ${routeFile} does not exist, skipping registration`);
          return;
        }

        // Convert to proper file:// URL format for ESM imports
        const fileUrl = new URL(`file://${routeFile.replace(/\\/g, '/')}`);

        try {
          await fastify.register(import(fileUrl), options);
          console.log(`Successfully registered route: ${routeName}`);
        } catch (error) {
          console.error(`Error registering route ${routeName}:`, error);
          // Continue with other routes rather than throwing
        }
      };

      // Register each route with error handling
      await registerRoute("auth", {
        prefix: "/api/auth",
        pouchDB: usersDB,
        couchDBUrl: COUCHDB_URL_USERS,
      });

      await registerRoute("user", {
        prefix: "/api/users",
        pouchDB: usersDB,
        couchDBUrl: COUCHDB_URL_USERS,
      });

      await registerRoute("branches", {
        prefix: "/api/branches",
        pouchDB: branchesDB,
        couchDBUrl: COUCHDB_URL_BRANCHES,
      });

      await registerRoute("departments", {
        prefix: "/api/departments",
        pouchDB: departmentsDB,
        couchDBUrl: COUCHDB_URL_DEPARTMENTS,
      });

      await registerRoute("categories", {
        prefix: "/api/categories",
        pouchDB: categoriesDB,
        couchDBUrl: COUCHDB_URL_CATEGORIES,
      });

      await registerRoute("items", {
        prefix: "/api/items",
        pouchDB: itemsDB,
        couchDBUrl: COUCHDB_URL_ITEMS,
      });

      await registerRoute("transactions", {
        prefix: "/api/transactions",
        pouchDB: transactionsDB,
        couchDBUrl: COUCHDB_URL_TRANSACTIONS,
      });

      await registerRoute("returns", {
        prefix: "/api/returns",
        pouchDB: returnsDB,
        couchDBUrl: COUCHDB_URL_RETURNS,
      });

      await registerRoute("expenses", {
        prefix: "/api/expenses",
        pouchDB: expensesDB,
        couchDBUrl: COUCHDB_URL_EXPENSES,
      });

      await registerRoute("reports", {
        prefix: "/api/reports",
        pouchDB: reportsDB,
        couchDBUrl: COUCHDB_URL_REPORTS,
      });

      await registerRoute("logs", {
        prefix: "/api/logs",
        pouchDB: logsDB,
        couchDBUrl: COUCHDB_URL_LOGS,
      });

      await registerRoute("inventoryChecks", {
        prefix: "/api/inventoryChecks",
        pouchDB: inventoryChecksDB,
        couchDBUrl: COUCHDB_URL_INVENTORY_CHECKS,
      });

      console.log("Route registration process completed");
    } catch (error) {
      console.error("Error during route registration process:", error);
      throw error;
    }



    fastify.get("/api/health", async (req, reply) => {
      reply.send({ status: "ok" });
    });

    // Setup sync for all databases
    const syncDB = (localDB, remoteURL, name) => {
      try {
        console.log(`Setting up sync for ${name} database...`);
        const remoteDB = new PouchDB(remoteURL, {
          auth: { username: COUCHDB_USERNAME, password: COUCHDB_PASSWORD },
          skip_setup: true, // Skip database creation
        });

        // Initial one-time sync
        localDB.sync(remoteDB).catch((err) => {
          console.error(`Initial ${name} sync failed:`, err);
          // Continue even if initial sync fails
        });

        // Continuous sync
        localDB
          .sync(remoteDB, { live: true, retry: true })
          .on("change", (change) => console.log(`${name} sync change:`, change))
          .on("paused", () => console.log(`${name} sync paused`))
          .on("active", () => console.log(`${name} sync active`))
          .on("error", (err) => console.error(`${name} sync error:`, err));
      } catch (error) {
        console.error(`Error setting up sync for ${name}:`, error);
        // Continue even if sync setup fails
      }
    };

    // Try to sync databases but continue even if sync fails
    try {
      syncDB(branchesDB, COUCHDB_URL_BRANCHES, "Branches");
      syncDB(departmentsDB, COUCHDB_URL_DEPARTMENTS, "Departments");
      syncDB(categoriesDB, COUCHDB_URL_CATEGORIES, "Categories");
      syncDB(itemsDB, COUCHDB_URL_ITEMS, "Items");
      syncDB(transactionsDB, COUCHDB_URL_TRANSACTIONS, "Transactions");
      syncDB(returnsDB, COUCHDB_URL_RETURNS, "Returns");
      syncDB(usersDB, COUCHDB_URL_USERS, "Users");
      syncDB(expensesDB, COUCHDB_URL_EXPENSES, "Expenses");
      syncDB(reportsDB, COUCHDB_URL_REPORTS, "Reports");
      syncDB(logsDB, COUCHDB_URL_LOGS, "Logs");
      syncDB(inventoryChecksDB, COUCHDB_URL_INVENTORY_CHECKS, "InventoryChecks");
    } catch (syncError) {
      console.error("Error setting up database sync:", syncError);
      // Continue even if sync setup fails
    }

    return fastify;
  } catch (error) {
    console.error("Error creating Fastify server:", error);
    throw error;
  }
};

// Start the Fastify server
const startServer = async () => {
  console.log("Starting Fastify server...");
  try {
    fastifyServer = await createFastifyServer();
    await fastifyServer.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Server is running on http://localhost:${PORT}`);
    return true;
  } catch (error) {
    console.error("Failed to start server:", error);
    // If it's an EADDRINUSE error, try a different port
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is in use. Please try a different port.`);
    }
    throw error;
  }
};

// Create the Electron window
const createWindow = async () => {
  console.log("Creating Electron window...");
  try {
    // Try to start the server, but continue even if it fails
    try {
      await startServer();
    } catch (serverError) {
      console.error("Warning: Server failed to start, but continuing with window creation:", serverError);
      // We'll continue anyway to show the window
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
      show: false, // Don't show until page is loaded
    });

    // Handle window load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`Failed to load window: ${errorDescription} (${errorCode})`);

      // Show a blank page with error information if the intended page fails to load
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Error Loading Application</title></head>
          <body>
            <h2>Failed to load application</h2>
            <p>Error: ${errorDescription}</p>
            <p>If you're in development mode, make sure your React dev server is running on port 3000.</p>
            <p>If you're in production mode, check that the server started correctly on port ${PORT}.</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>
      `);
      mainWindow.show();
    });

    // Load the appropriate URL based on the environment
    const startUrl = isDev ? "http://localhost:3000" : `http://localhost:${PORT}`;
    console.log(`Loading URL: ${startUrl}`);

    // Show window when loaded
    mainWindow.webContents.on('did-finish-load', () => {
      console.log("Window content loaded successfully");
      mainWindow.show();
    });

    await mainWindow.loadURL(startUrl);

    if (isDev) {
      console.log("Opening DevTools in development mode");
      mainWindow.webContents.openDevTools();
    }
  } catch (error) {
    console.error("Error creating window:", error);

    // If window creation fails entirely, create a simple error window
    try {
      mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Application Error</title></head>
          <body>
            <h2>Error Starting Application</h2>
            <p>There was an error starting the application: ${error.message}</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>
      `);
    } catch (fallbackError) {
      console.error("Failed to create error window:", fallbackError);
    }
  }
};

// Error handling for unhandled exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle app lifecycle
app.whenReady()
  .then(() => {
    console.log("Electron app is ready");
    createWindow();
  })
  .catch(err => {
    console.error("Error during app.whenReady():", err);
  });

app.on("window-all-closed", () => {
  console.log("All windows closed");
  if (process.platform !== "darwin") {
    if (fastifyServer) {
      console.log("Closing Fastify server");
      fastifyServer.close(() => {
        console.log("Fastify server closed");
      });
    }
    console.log("Quitting application");
    app.quit();
  }
});

app.on("activate", () => {
  console.log("App activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Add a new IPC handler to check if server is running
ipcMain.handle('is-server-running', () => {
  return !!fastifyServer;
});