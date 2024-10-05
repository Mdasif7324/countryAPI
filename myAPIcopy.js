const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');


// MongoDB connection details
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'geojsonDB';
const collectionName = 'geojsonCollection';

// Initialize Express app
const app = express();
app.use(bodyParser.json()); // Middleware to parse JSON bodies

// MongoDB client
let db; // Variable to hold the database connection

const client = new MongoClient(mongoUrl); // No need for useNewUrlParser or useUnifiedTopology

// Initialize MongoDB connection
async function initializeDb() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName); // Store the database connection
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
}

// Ensure database connection is established before handling any requests
function ensureDbConnection(req, res, next) {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  next(); // Proceed if the database is connected
}

// Route to get all GeoJSON data
app.get('/geojson', ensureDbConnection, async (req, res) => {
  try {
    const data = await db.collection(collectionName).find({}).toArray();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch data: ${err.message}` });
  }
});

// Route to get single data by country_name, _id, or cca3_code
app.get('/geojson/:identifier', ensureDbConnection, async (req, res) => {
  const { identifier } = req.params;

  let query = {};
  if (ObjectId.isValid(identifier)) {
    query = { _id: new ObjectId(identifier) };
  } else {
    query = {
      $or: [{ country_name: identifier }, { cca3_code: identifier }]
    };
  }

  try {
    const data = await db.collection(collectionName).findOne(query);
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(404).json({ message: 'Data not found' });
    }
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch data: ${err.message}` });
  }
});

// Route to add a new GeoJSON document
app.post('/geojson', ensureDbConnection, async (req, res) => {
  const newData = req.body;

  try {
    const result = await db.collection(collectionName).insertOne(newData);
    res.status(201).json(result.ops[0]); // Return the newly inserted document
  } catch (err) {
    res.status(500).json({ error: 'Failed to add data' });
  }
});

// Route to update a GeoJSON document by _id, country_name, or cca3_code
app.put('/geojson/:identifier', ensureDbConnection, async (req, res) => {
  const { identifier } = req.params;
  const updatedData = req.body;

  let query = {};
  if (ObjectId.isValid(identifier)) {
    query = { _id: new ObjectId(identifier) };
  } else if (identifier.length === 3) {
    query = { cca3_code: identifier };
  } else {
    query = { country_name: identifier };
  }

  try {
    const result = await db.collection(collectionName).findOneAndUpdate(query, { $set: updatedData }, { returnOriginal: false });
    if (result.value) {
      res.status(200).json(result.value); // Return the updated document
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update data' });
  }
});

// Route to delete a GeoJSON document by _id, country_name, or cca3_code
app.delete('/geojson/:identifier', ensureDbConnection, async (req, res) => {
  const { identifier } = req.params;

  let query = {};
  if (ObjectId.isValid(identifier)) {
    query = { _id: new ObjectId(identifier) };
  } else if (identifier.length === 3) {
    query = { cca3_code: identifier };
  } else {
    query = { country_name: identifier };
  }

  try {
    const result = await db.collection(collectionName).deleteOne(query);
    if (result.deletedCount > 0) {
      res.status(200).json({ message: 'Data deleted successfully' });
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Start the server and initialize the MongoDB connection
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  initializeDb(); // Initialize MongoDB when server starts
});
