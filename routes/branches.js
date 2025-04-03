// Fastify plugin for branches with PouchDB/CouchDB

// Helper function to sanitize branch data
const sanitizeBranchData = (branch) => ({
    _id: branch.id, // Use _id for CouchDB/PouchDB
    id: branch.id,
    branchName: branch.branchName || '',
    location: branch.location || null,
    phone: branch.phone || null,
    createdBy: branch.createdBy || 'unknown',
    createdAt: branch.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

// Fastify plugin export
export default async function (fastify, opts) {
    // GET - Fetch all branches
    fastify.get('/', async (req, reply) => {
        const db = req.pouchDB; // Use PouchDB instance from main/index.js

        try {
            const result = await db.allDocs({ 
                include_docs: true,
                attachments: false
            });
            
            const branches = result.rows.map(row => {
                const doc = row.doc;
                return {
                    id: doc._id,
                    branchName: doc.branchName,
                    location: doc.location,
                    phone: doc.phone,
                    createdBy: doc.createdBy,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt
                };
            });

            return reply.send(branches);
        } catch (error) {
            console.error('Error fetching branches:', error);
            return reply.status(500).send({ message: 'Error fetching branches', error: error.message });
        }
    });

    // POST - Add a new branch
    fastify.post('/', async (req, reply) => {
        const db = req.pouchDB; // Use PouchDB instance from main/index.js

        try {
            const branchData = req.body;

            if (!branchData.id || !branchData.branchName) {
                return reply.status(400).send({ message: 'Required fields missing: id, branchName' });
            }

            // Check if document with this ID already exists
            try {
                await db.get(branchData.id);
                return reply.status(409).send({ message: 'Branch with this ID already exists' });
            } catch (err) {
                // Document doesn't exist, which is what we want
                if (err.name !== 'not_found') {
                    throw err;
                }
            }

            const sanitizedData = sanitizeBranchData(branchData);
            const response = await db.put(sanitizedData);

            return reply.send({ 
                id: sanitizedData.id, 
                rev: response.rev,
                message: 'Branch added successfully' 
            });
        } catch (error) {
            console.error('Error adding branch:', error);
            return reply.status(500).send({ message: 'Error adding branch', error: error.message });
        }
    });

    // PUT - Update a branch
    fastify.put('/:id', async (req, reply) => {
        const db = req.pouchDB; // Use PouchDB instance from main/index.js

        try {
            const { id } = req.params;
            const branchData = req.body;

            // Get the current document to retrieve its revision
            let doc;
            try {
                doc = await db.get(id);
            } catch (err) {
                if (err.name === 'not_found') {
                    return reply.status(404).send({ message: 'Branch not found' });
                }
                throw err;
            }

            const sanitizedData = sanitizeBranchData({ id, ...branchData });
            
            // Keep the _rev from the existing document
            sanitizedData._rev = doc._rev;
            
            const response = await db.put(sanitizedData);

            return reply.send({ 
                message: 'Branch updated successfully',
                rev: response.rev
            });
        } catch (error) {
            console.error('Error updating branch:', error);
            return reply.status(500).send({ message: 'Error updating branch', error: error.message });
        }
    });

    // DELETE - Delete a branch
    fastify.delete('/:id', async (req, reply) => {
        const db = req.pouchDB; // Use PouchDB instance from main/index.js

        try {
            const { id } = req.params;

            // Get the current document to retrieve its revision
            let doc;
            try {
                doc = await db.get(id);
            } catch (err) {
                if (err.name === 'not_found') {
                    return reply.status(404).send({ message: 'Branch not found' });
                }
                throw err;
            }

            const response = await db.remove(doc);

            return reply.send({ 
                message: 'Branch deleted successfully',
                rev: response.rev
            });
        } catch (error) {
            console.error('Error deleting branch:', error);
            return reply.status(500).send({ message: 'Error deleting branch', error: error.message });
        }
    });

    // POST - Trigger sync with remote CouchDB
    fastify.post('/sync', async (req, reply) => {
        const localDB = req.pouchDB;
        const remoteURL = req.couchDBUrl;

        try {
            const remoteDB = new PouchDB(remoteURL, {
                auth: {
                    username: req.couchDBUsername || 'admin',
                    password: req.couchDBPassword || 'password'
                }
            });

            const syncResult = await localDB.sync(remoteDB, {
                live: false,
                retry: true
            });

            return reply.send({
                message: 'Sync completed successfully',
                pushed: syncResult.push?.docs_written || 0,
                pulled: syncResult.pull?.docs_written || 0
            });
        } catch (error) {
            console.error('Error syncing with remote CouchDB:', error);
            return reply.status(500).send({
                message: 'Error syncing with remote CouchDB',
                error: error.message
            });
        }
    });
}