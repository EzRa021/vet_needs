import { app, BrowserWindow, ipcMain } from 'electron';
import Fastify from 'fastify';
import path from 'path';
import sqlite from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import firebaseAdmin from 'firebase-admin';
import net from 'net';

// Resolve __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Environment detection
const isDev = process.env.NODE_ENV === 'development';

// Improved path resolution for packaged app
const appRoot = isDev ? path.join(__dirname, '..') : app.getAppPath();
const appUnpacked = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app.asar.unpacked');

// Configuration
const PORT = 8000;
// Store the actual port used in a global variable to allow for dynamic port assignment
global.serverPort = PORT;
let mainWindow;
let fastifyServer;
let shutdownInProgress = false;

// Debug path info
console.log("Environment:", isDev ? "Development" : "Production");
console.log("App path:", app.getAppPath());
console.log("Resource path:", process.resourcesPath);
console.log("__dirname:", __dirname);
console.log("appRoot:", appRoot);
console.log("appUnpacked:", appUnpacked);

// Check if a port is available
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is already in use`);
                resolve(false);
            } else {
                console.error(`Error checking port ${port}:`, err);
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port, '127.0.0.1');
    });
};


// Load service account with better error handling
let serviceAccount = {};
try {
    // Adjust service account path based on environment
    const serviceAccountPath = isDev
        ? path.join(appRoot, 'backend/serviceAccount.json')
        : path.join(appUnpacked, 'backend/serviceAccount.json');

    console.log("Attempting to load service account from:", serviceAccountPath);

    if (existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        console.log("Service account loaded successfully");
    } else {
        console.warn("Service account file not found:", serviceAccountPath);
    }
} catch (error) {
    console.error("Failed to load service account:", error);
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDDOS38ndSwcXvL_3sdPn6DCroEEj_0EDg",
    authDomain: "utilitarian-web-421409.firebaseapp.com",
    databaseURL: "https://utilitarian-web-421409-default-rtdb.firebaseio.com/",
    projectId: "utilitarian-web-421409",
    storageBucket: "utilitarian-web-421409.firebasestorage.app",
    messagingSenderId: "778959402406",
    appId: "1:778959402406:web:081d7fa22bcad975f34b67"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

// Initialize Firebase Admin with better error handling
try {
    if (Object.keys(serviceAccount).length > 0) {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
            databaseURL: "https://utilitarian-web-421409-default-rtdb.firebaseio.com/"
        });
        console.log("Firebase Admin initialized successfully");
    } else {
        console.warn("Skipping Firebase Admin initialization due to missing service account");
    }
} catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
}

// Database initialization
const initializeDatabase = () => {
    // Use appData for production and appRoot for development
    const dbPath = isDev
        ? path.join(appRoot, 'inventory.db')
        : path.join(app.getPath('desktop'), 'VetNeed', 'inventory.db'); // Adding 'VetNeed' as a subfolder for organization

    console.log("Database path:", dbPath);

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!existsSync(dbDir)) {
        try {
            mkdirSync(dbDir, { recursive: true });
            console.log("Created database directory:", dbDir);
        } catch (error) {
            console.error("Failed to create database directory:", error);
            throw new Error(`Cannot initialize database: directory creation failed at ${dbDir}`);
        }
    }


    try {
        const db = sqlite(dbPath);
        db.pragma('foreign_keys = ON');
        // Tables creation
        db.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                branchName TEXT,
                departmentId TEXT,
                departmentName TEXT,
                categoryId TEXT,
                categoryName TEXT,
                name TEXT NOT NULL,
                description TEXT,
                costPrice REAL DEFAULT 0,
                sellingPrice REAL DEFAULT 0,
                discountPrice REAL DEFAULT 0,
                inStock INTEGER DEFAULT 0,
                stockManagement TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                action TEXT NOT NULL,
                message TEXT NOT NULL,
                date TEXT NOT NULL,
                metadata TEXT,
                synced INTEGER DEFAULT 0,
                FOREIGN KEY (branchId) REFERENCES branches(id)
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT NOT NULL,
                branchId TEXT,
                name TEXT,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                branchName TEXT,
                branchPhone TEXT,
                branchLocation TEXT,
                permissions TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS deleted_departments (
id TEXT NOT NULL,
branchId TEXT NOT NULL,
deletedAt TEXT NOT NULL,
PRIMARY KEY (id, branchId)
);
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS branches (
                id TEXT PRIMARY KEY,
                branchName TEXT NOT NULL,
                location TEXT,
                phone TEXT,
                createdBy TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branchId)`);
        db.exec(`
            CREATE TABLE IF NOT EXISTS allBranchItems (
                id TEXT NOT NULL,
                branchId TEXT NOT NULL,
                branchName TEXT,
                departmentId TEXT,
                categoryId TEXT,
                departmentName TEXT,
                categoryName TEXT,
                name TEXT NOT NULL,
                description TEXT,
                costPrice REAL DEFAULT 0,
                sellingPrice REAL DEFAULT 0,
                discountPrice REAL DEFAULT 0,
                inStock INTEGER DEFAULT 0,
                stockManagement TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, branchId, departmentId, categoryId)
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                paymentMethod TEXT NOT NULL,
                branchId TEXT NOT NULL,
                total REAL NOT NULL,
                items TEXT NOT NULL,
                number INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                departmentId TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                data TEXT DEFAULT '{}',
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (branchId) REFERENCES branches(id)
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS deleted_categories (
     id TEXT NOT NULL,
     branchId TEXT NOT NULL,
     departmentId TEXT NOT NULL,
     deletedAt TEXT NOT NULL,
     PRIMARY KEY (id, branchId, departmentId)
 );
 
         `);
        db.exec(`
           CREATE TABLE IF NOT EXISTS deleted_items (
     id TEXT NOT NULL,
     branchId TEXT NOT NULL,
     deletedAt TEXT NOT NULL,
     PRIMARY KEY (id, branchId)
 );
          `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                name TEXT,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                createdAt TEXT,
                updatedAt TEXT
            )
        `);
        db.exec(`
        CREATE TABLE IF NOT EXISTS departments (
  id TEXT NOT NULL,
  branchId TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (id, branchId)
);

        `);


        db.exec(`
            CREATE TABLE IF NOT EXISTS returns (
                id TEXT PRIMARY KEY,
                branchId TEXT NOT NULL,
                transactionId TEXT NOT NULL,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                reason TEXT,
                status TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS transaction_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    branchId TEXT NOT NULL,
    action TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, branchId, action)
  );
  
          `);


        db.exec(`
         CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
    
            `);

        db.exec(`CREATE TABLE IF NOT EXISTS department_sync (
    department_id TEXT,
    branchId TEXT,
    action TEXT,
    synced INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (department_id, branchId, action)
);
`)
        db.exec(`CREATE TABLE IF NOT EXISTS deleted_categories (
  id TEXT,
  branchId TEXT,
  departmentId TEXT,
  deletedAt TEXT,
  PRIMARY KEY (id, branchId, departmentId)
);

`)
        db.exec(`CREATE TABLE IF NOT EXISTS item_sync (
    item_id TEXT,
    branchId TEXT,
    action TEXT,
    departmentId TEXT,
    categoryId TEXT,
    synced INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, branchId, action)
)

  
  `)
        db.exec(`CREATE TABLE IF NOT EXISTS return_sync (
    return_id TEXT NOT NULL,
    branchId TEXT NOT NULL,
    action TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (return_id, branchId, action)
);

  
  `)


        db.exec(`CREATE INDEX IF NOT EXISTS idx_transaction_sync_pending ON transaction_sync (branchId, synced);`)
        db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions (branchId);`)
        db.exec(`CREATE INDEX IF NOT EXISTS idx_items_branch ON items(branchId)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_items_branch_dept_cat ON items(branchId, departmentId, categoryId)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_allbranch_branch ON allBranchItems(branchId)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_allbranch_branch_dept ON allBranchItems(branchId, departmentId)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_allbranch_branch_dept_cat ON allBranchItems(branchId, departmentId, categoryId)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_branch ON reports(branchId)`);

        return db;
    } catch (error) {
        console.error("Database initialization error:", error);
        throw error;
    }
};

const dbSqlite = initializeDatabase();

// Dynamic route imports with improved path resolution
const getRoutes = async () => {
    try {
        // Fix routes path for production
        const routesPath = isDev
            ? path.join(appRoot, 'routes')
            : path.join(appRoot, 'routes');

        console.log("Loading routes from:", routesPath);

        const routeModules = [
            { name: 'authRouter', path: 'auth.js' },
            { name: 'branchesRouter', path: 'branches.js' },
            { name: 'categoriesRouter', path: 'categories.js' },
            { name: 'departmentsRouter', path: 'departments.js' },
            { name: 'itemsRouter', path: 'items.js' },
            { name: 'transactionsRouter', path: 'transactions.js' },
            { name: 'returnsRouter', path: 'returns.js' },
            { name: 'allItemsRouter', path: 'allItems.js' },
            { name: 'expensesRouter', path: 'expenses.js' },
            { name: 'reportsRouter', path: 'reports.js' },
            { name: 'inventoryCheckRouter', path: 'inventoryChecks.js' },
            { name: 'logsRouter', path: 'logs.js' },
            { name: 'permissionsRouter', path: 'permissions.js' },
            { name: 'usersRouter', path: 'user.js' },
            { name: 'waybillsRouter', path: 'waybills.js' }
        ];

        const routes = {};
        for (const route of routeModules) {
            try {
                const modulePath = path.join(routesPath, route.path);
                console.log(`Importing route: ${route.name} from ${modulePath}`);

                // Handle ESM imports properly in production environment
                let module;
                if (isDev) {
                    module = await import(`file://${modulePath}`);
                } else {
                    // In production, use a more robust path resolution
                    const normalizedPath = modulePath.replace(/\\/g, '/');
                    try {
                        module = await import(`file://${normalizedPath}`);
                    } catch (e) {
                        console.error(`Failed to import with normalized path: ${normalizedPath}`, e);
                        // Try another approach if needed
                        module = await import(normalizedPath);
                    }
                }

                routes[route.name] = module.default;
                console.log(`Successfully imported ${route.name}`);
            } catch (error) {
                console.error(`Failed to import ${route.name}:`, error);
                routes[route.name] = null; // Fallback for missing routes
            }
        }

        return routes;
    } catch (error) {
        console.error("Error loading routes:", error);
        return {};
    }
};


// Fastify server setup with improved error handling
const createFastifyServer = async () => {
    const fastify = Fastify({
        logger: true,
        disableRequestLogging: false
    });

    // JSON parsing
    fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
        try {
            const json = JSON.parse(body);
            done(null, json);
        } catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    });

    // CORS setup for development
    if (isDev) {
        await fastify.register(import('@fastify/cors'), {
            origin: 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        });
    }

    // Dependency injection hook
    fastify.addHook('preHandler', (req, reply, done) => {
        req.db = dbSqlite;
        req.firebaseAuth = auth;
        req.firebaseDb = db;
        req.firebaseAdmin = firebaseAdmin;
        done();
    });

    try {
        // Configure routes
        const routes = await getRoutes();
        console.log("Available routes:", Object.keys(routes));

        // Register API routes with better error handling
        const routeDefinitions = {
            '/api/auth': routes.authRouter,
            '/api/branches': routes.branchesRouter,
            '/api/categories': routes.categoriesRouter,
            '/api/departments': routes.departmentsRouter,
            '/api/items': routes.itemsRouter,
            '/api/transactions': routes.transactionsRouter,
            '/api/returns': routes.returnsRouter,
            '/api/all-items': routes.allItemsRouter,
            '/api/expenses': routes.expensesRouter,
            '/api/reports': routes.reportsRouter,
            '/api/inventory-checks': routes.inventoryCheckRouter,
            '/api/logs': routes.logsRouter,
            '/api/permissions': routes.permissionsRouter,
            '/api/users': routes.usersRouter,
            '/api/waybills': routes.waybillsRouter
        };

        // Register each route with error handling
        for (const [endpoint, router] of Object.entries(routeDefinitions)) {
            try {
                if (router) {
                    fastify.register(router, { prefix: endpoint });
                    console.log(`✅ Registered route: ${endpoint}`);
                } else {
                    console.warn(`⚠️ Route not available: ${endpoint}`);
                    // Create a fallback handler for missing routes
                    fastify.all(`${endpoint}/*`, (req, reply) => {
                        console.log(`Fallback handler for ${req.url}`);
                        reply.status(503).send({
                            error: "Service unavailable",
                            message: "This API endpoint is not available",
                            path: req.url
                        });
                    });

                    // Root endpoint handler
                    fastify.all(endpoint, (req, reply) => {
                        console.log(`Root fallback handler for ${req.url}`);
                        reply.status(503).send({
                            error: "Service unavailable",
                            message: "This API endpoint is not available",
                            path: req.url
                        });
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to register route ${endpoint}:`, error);
                // Create error handler for failed route registration
                fastify.all(`${endpoint}/*`, (req, reply) => {
                    reply.status(500).send({
                        error: "Internal Server Error",
                        message: "Failed to register this API endpoint",
                        path: req.url
                    });
                });
            }
        }

        // Static file serving with improved path resolution
        const staticPath = isDev
            ? path.join(appRoot, 'out')
            : path.join(appRoot, 'out');

        console.log("Serving static files from:", staticPath);

        // Register static file server first
        if (existsSync(staticPath)) {
            await fastify.register(import('@fastify/static'), {
                root: staticPath,
                prefix: '/',
                decorateReply: true,
                wildcard: false // Disable wildcard handling to prevent route conflicts
            });
            console.log("Static file server registered successfully");
        } else {
            console.error("Static files directory not found:", staticPath);
        }

        // Modified NotFound handler for client-side routing
        fastify.setNotFoundHandler((req, reply) => {
            try {
                const requestPath = req.url;
                console.log(`Handling request for: ${requestPath}`);

                // Skip API routes
                if (requestPath.startsWith('/api/')) {
                    return reply.status(404).send({
                        error: "Not Found",
                        message: "API endpoint not found",
                        path: requestPath
                    });
                }

                // Remove query parameters
                const baseUrl = requestPath.split('?')[0];

                // Try different possible paths for the requested route
                const possiblePaths = [
                    path.join(staticPath, `${baseUrl}.html`),
                    path.join(staticPath, baseUrl, 'index.html'),
                    path.join(staticPath, 'index.html')
                ];

                // Find the first existing path
                let existingPath = null;
                for (const p of possiblePaths) {
                    if (existsSync(p)) {
                        existingPath = p;
                        break;
                    }
                }

                if (existingPath) {
                    console.log(`Serving file: ${existingPath}`);
                    // Use relative path for sendFile
                    const relativePath = path.relative(staticPath, existingPath);
                    return reply.sendFile(relativePath);
                } else {
                    console.log('No matching file found, serving index.html for client-side routing');
                    return reply.sendFile('index.html');
                }
            } catch (error) {
                console.error('Error serving file:', error);
                reply.status(500).send('Internal Server Error');
            }
        });

        // Global error handler
        fastify.setErrorHandler((error, request, reply) => {
            console.error(`API Error: ${request.url}`, error);
            reply.status(error.statusCode || 500).send({
                error: error.name || "Error",
                message: error.message || "An unknown error occurred",
                statusCode: error.statusCode || 500,
                path: request.url
            });
        });

        return fastify;
    } catch (error) {
        console.error("Fastify server setup error:", error);
        throw error;
    }
};

// Start the server with improved error handling and port management
const startServer = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Creating Fastify server...");
            const fastifyApp = await createFastifyServer();

            // Try initial port
            let currentPort = PORT;
            let maxPortAttempts = 5;
            let portAvailable = await isPortAvailable(currentPort);

            // Try up to 5 additional ports if needed
            while (!portAvailable && maxPortAttempts > 0) {
                currentPort++;
                console.log(`Port ${PORT} is in use, trying port ${currentPort}...`);
                portAvailable = await isPortAvailable(currentPort);
                maxPortAttempts--;
            }

            if (!portAvailable) {
                throw new Error(`Unable to find available port after trying ports ${PORT}-${currentPort}`);
            }

            // Store the actual port used
            global.serverPort = currentPort;

            console.log(`Starting server on port ${currentPort}...`);
            fastifyServer = await fastifyApp.listen({ port: currentPort, host: '0.0.0.0' });
            console.log(`Server is running at http://localhost:${currentPort}`);
            resolve(fastifyServer);
        } catch (error) {
            console.error("Failed to start server:", error);
            reject(error);
        }
    });
};

// Cleanup resources function
const cleanupResources = async () => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    console.log("Cleaning up application resources...");

    // Close database connection
    if (dbSqlite) {
        try {
            dbSqlite.close();
            console.log("Database connection closed");
        } catch (error) {
            console.error("Error closing database:", error);
        }
    }

    // Close server with proper await
    if (fastifyServer) {
        try {
            await fastifyServer.close();
            console.log("Fastify server closed successfully");
        } catch (error) {
            console.error("Error closing Fastify server:", error);
        }
    }

    console.log("All resources cleaned up");
};

// Create Electron window with improved error handling
const createWindow = async () => {
    try {
        console.log("Creating application window...");

        if (!isDev) {
            console.log("Production mode - starting internal server...");
            await startServer();
        } else {
            console.log("Development mode - Fastify initialized but not started (using external server at :3000)");
        }

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: "VetNeed",
            show: false
        });

        const startUrl = isDev ? 'http://localhost:3000' : `http://localhost:${global.serverPort}`;
        console.log("Loading application from:", startUrl);

        mainWindow.webContents.on("did-navigate", (event, url) => {
            console.log("Navigated to:", url);
        });

        // Open DevTools in development mode
        if (isDev) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        // Load the app with a timeout and retry logic
        let loadAttempts = 0;
        const maxAttempts = 3;

        const attemptLoad = async () => {
            try {
                loadAttempts++;
                console.log(`Loading URL (attempt ${loadAttempts}): ${startUrl}`);
                await mainWindow.loadURL(startUrl);
                mainWindow.show();
                console.log("Application loaded successfully");
            } catch (error) {
                console.error(`Failed to load URL (attempt ${loadAttempts}):`, error);

                if (loadAttempts < maxAttempts) {
                    console.log(`Retrying in 1 second...`);
                    setTimeout(attemptLoad, 1000); // Wait 1 second before retry
                } else {
                    console.error("Max load attempts reached, showing error page");
                    mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
                        <html>
                            <body style="font-family: sans-serif; padding: 20px;">
                                <h2>Application Load Error</h2>
                                <p>Failed to load application after ${maxAttempts} attempts.</p>
                                <p>Error: ${error.toString()}</p>
                                <p>Please check if the server is running and try again.</p>
                            </body>
                        </html>
                    `);
                    mainWindow.show();
                }
            }
        };

        await attemptLoad();

        // Handle load failures
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
            console.error(`Failed to load: ${errorDesc} (${errorCode})`);
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
                    <html>
                        <body style="font-family: sans-serif; padding: 20px;">
                            <h2>Load Error</h2>
                            <p>${errorDesc} (${errorCode})</p>
                            <p>URL: ${startUrl}</p>
                        </body>
                    </html>
                `);
            }
        });

        // Check for blank page
        mainWindow.webContents.on('did-finish-load', () => {
            console.log("Finished loading");
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.executeJavaScript(`
                    if (document.body.innerHTML.trim() === '') {
                        document.body.innerHTML = '<h2>Blank Page</h2><p>No content loaded from ${startUrl}</p>';
                    }
                `).catch(err => console.error("Error executing JavaScript:", err));
            }
        });
    } catch (error) {
        console.error("Failed to initialize application:", error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
                <html>
                    <body style="font-family: sans-serif; padding: 20px;">
                        <h2>Fatal Application Error</h2>
                        <p>${error.toString()}</p>
                    </body>
                </html>
            `);
            mainWindow.show();
        }
    }
};

// App lifecycle events
app.whenReady().then(createWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Improved window-all-closed event
app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        try {
            await cleanupResources();
            app.quit();
        } catch (err) {
            console.error("Error during cleanup on window-all-closed:", err);
            app.exit(1);
        }
    }
});

// Better application quit handling
app.on('before-quit', async (event) => {
    if (!shutdownInProgress) {
        event.preventDefault();
        console.log("Application is about to quit, performing cleanup...");

        // Set a timeout for cleanup in case it hangs
        const forceQuitTimeout = setTimeout(() => {
            console.warn("Cleanup timed out after 3 seconds, forcing quit");
            app.exit(0);
        }, 3000);

        try {
            await cleanupResources();
            clearTimeout(forceQuitTimeout);
            app.quit();
        } catch (err) {
            console.error("Error during cleanup on before-quit:", err);
            clearTimeout(forceQuitTimeout);
            app.exit(1);
        }
    }
});

// Global error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fatal-error', error.toString());
    }
});

// Add SIGINT handler for better CLI termination
if (process.platform !== 'win32') {
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        try {
            await cleanupResources();
            app.quit();
        } catch (err) {
            console.error("Error during SIGINT cleanup:", err);
            process.exit(1);
        }
    });
}

// IPC handlers
ipcMain.handle('get-db-path', () => {
    const dbPath = isDev
        ? path.join(appRoot, 'inventory.db')
        : path.join(app.getPath('desktop'), 'VetNeed', 'inventory.db');
    return dbPath;
});

// Add a handler to get the current server port
ipcMain.handle('get-server-port', () => {
    return global.serverPort;
});

export default app;




        "electron": "^35.0.2",
        "electron-builder": "^25.1.8",
        "electron-rebuild": "^3.2.9",
        "electron-reloader": "^1.2.3",