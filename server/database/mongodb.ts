import { MongoClient, Db, ServerApiVersion } from 'mongodb';

export interface MongoStatus {
  configured: boolean;
  connected: boolean;
  databaseName: string;
  sanitizedUri: string;
  host: string;
  pingLatencyMs: number | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  collections: string[];
  documentCounts: Record<string, number>;
}

let client: MongoClient | null = null;
let database: Db | null = null;
let lastConnectedAt: string | null = null;
let lastError: string | null = null;
let pingLatencyMs: number | null = null;

// Safe URI masking: never expose username/password credentials in logs or API
export function sanitizeMongoUri(rawUri?: string): string {
  if (!rawUri) return '';
  try {
    return rawUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:********@');
  } catch {
    return 'mongodb+srv://***:***@cluster...';
  }
}

export function extractHostFromUri(rawUri?: string): string {
  if (!rawUri) return 'Not configured';
  try {
    const afterAt = rawUri.split('@')[1];
    if (afterAt) {
      return afterAt.split('/')[0]?.split('?')[0] || 'MongoDB Atlas Cluster';
    }
    const match = rawUri.match(/\/\/([^/?]+)/);
    return match ? match[1] : 'MongoDB Cluster';
  } catch {
    return 'MongoDB Atlas Cluster';
  }
}

export function getDatabaseNameFromUri(rawUri?: string): string {
  if (!rawUri) return 'whatsapp_learning';
  try {
    const afterHost = rawUri.split('?')[0];
    const segments = afterHost.split('/');
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && !lastSeg.includes('@') && !lastSeg.includes(':')) {
      return lastSeg;
    }
    return 'whatsapp_learning';
  } catch {
    return 'whatsapp_learning';
  }
}

/**
 * Initializes and connects to MongoDB Atlas using process.env.MONGODB_URI
 */
export async function connectToMongoDB(): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    lastError = 'MONGODB_URI environment variable is not defined.';
    return {
      success: false,
      error: 'MONGODB_URI secret is not set in environment. Please configure it in Google AI Studio or .env file.',
    };
  }

  try {
    if (client) {
      // Test existing connection
      const start = Date.now();
      await database?.command({ ping: 1 });
      pingLatencyMs = Date.now() - start;
      lastConnectedAt = new Date().toISOString();
      lastError = null;
      return { success: true, latencyMs: pingLatencyMs };
    }

    const dbName = getDatabaseNameFromUri(uri);
    const start = Date.now();

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    await client.connect();
    database = client.db(dbName);
    await database.command({ ping: 1 });

    pingLatencyMs = Date.now() - start;
    lastConnectedAt = new Date().toISOString();
    lastError = null;

    console.log(`✅ [MongoDB Atlas] Successfully connected to database "${dbName}" in ${pingLatencyMs}ms!`);

    // Ensure initial collections and indexes exist
    await initializeIndexes(database);

    return { success: true, latencyMs: pingLatencyMs };
  } catch (err: any) {
    const errMsg = err?.message || 'Failed to connect to MongoDB Atlas';
    lastError = errMsg;
    pingLatencyMs = null;
    console.error(`❌ [MongoDB Atlas] Connection failed:`, errMsg);

    // Clean up stale client instance
    if (client) {
      try {
        await client.close();
      } catch {}
      client = null;
      database = null;
    }

    return { success: false, error: errMsg };
  }
}

/**
 * Ensures indexes exist on key fields for performance and reliability
 */
async function initializeIndexes(db: Db) {
  try {
    await db.collection('messages').createIndex({ timestamp: -1 });
    await db.collection('messages').createIndex({ userId: 1 });
    await db.collection('quiz_results').createIndex({ userId: 1, date: -1 });
    await db.collection('learning_progress').createIndex({ userId: 1, subject: 1 });
    await db.collection('student_profiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('verification_records').createIndex({ createdAt: -1 });
  } catch (err) {
    console.warn('⚠️ [MongoDB Atlas] Index creation notice (non-fatal):', err);
  }
}

/**
 * Returns current MongoDB Atlas connection status, metrics, and document counts
 */
export async function getMongoStatus(): Promise<MongoStatus> {
  const uri = process.env.MONGODB_URI?.trim();
  const configured = Boolean(uri);
  const dbName = getDatabaseNameFromUri(uri);
  const host = extractHostFromUri(uri);
  const sanitizedUri = sanitizeMongoUri(uri);

  let connected = false;
  const collections: string[] = [];
  const documentCounts: Record<string, number> = {};

  if (configured && database) {
    try {
      const start = Date.now();
      await database.command({ ping: 1 });
      pingLatencyMs = Date.now() - start;
      connected = true;
      lastError = null;

      // Fetch collection names and count documents
      const cols = await database.listCollections().toArray();
      for (const col of cols) {
        collections.push(col.name);
        try {
          const count = await database.collection(col.name).estimatedDocumentCount();
          documentCounts[col.name] = count;
        } catch {
          documentCounts[col.name] = 0;
        }
      }
    } catch (err: any) {
      connected = false;
      lastError = err?.message || 'Connection ping failed';
    }
  }

  return {
    configured,
    connected,
    databaseName: dbName,
    sanitizedUri,
    host,
    pingLatencyMs,
    lastConnectedAt,
    lastError,
    collections,
    documentCounts,
  };
}

/**
 * Get MongoDB Database instance (or null if not connected)
 */
export function getMongoDb(): Db | null {
  return database;
}

// ----------------------------------------------------
// Data Operations: Chat Messages
// ----------------------------------------------------
export async function saveChatMessageMongo(msg: any): Promise<boolean> {
  if (!database) return false;
  try {
    const doc = {
      ...msg,
      savedToMongoAt: new Date().toISOString(),
    };
    await database.collection('messages').insertOne(doc);
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save message to MongoDB:', err);
    return false;
  }
}

export async function getChatMessagesMongo(userId?: string, limit = 50): Promise<any[]> {
  if (!database) return [];
  try {
    const filter = userId ? { userId } : {};
    return await database
      .collection('messages')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn('⚠️ Failed to read messages from MongoDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// Data Operations: Quiz Results & Adaptive Tests
// ----------------------------------------------------
export async function saveQuizResultMongo(result: any): Promise<boolean> {
  if (!database) return false;
  try {
    const doc = {
      ...result,
      savedToMongoAt: new Date().toISOString(),
    };
    await database.collection('quiz_results').insertOne(doc);
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save quiz result to MongoDB:', err);
    return false;
  }
}

export async function getQuizResultsMongo(userId?: string, limit = 50): Promise<any[]> {
  if (!database) return [];
  try {
    const filter = userId ? { userId } : {};
    return await database
      .collection('quiz_results')
      .find(filter)
      .sort({ savedToMongoAt: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn('⚠️ Failed to read quiz results from MongoDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// Data Operations: Student Profiles
// ----------------------------------------------------
export async function saveStudentProfileMongo(profile: any): Promise<boolean> {
  if (!database || !profile?.userId) return false;
  try {
    const sanitized = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    await database.collection('student_profiles').updateOne(
      { userId: profile.userId },
      { $set: sanitized },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save student profile to MongoDB:', err);
    return false;
  }
}

export async function getStudentProfileMongo(userId: string): Promise<any | null> {
  if (!database || !userId) return null;
  try {
    return await database.collection('student_profiles').findOne({ userId });
  } catch (err) {
    console.warn('⚠️ Failed to read student profile from MongoDB:', err);
    return null;
  }
}

export async function getAllStudentProfilesMongo(): Promise<any[]> {
  if (!database) return [];
  try {
    return await database.collection('student_profiles').find({}).toArray();
  } catch (err) {
    console.warn('⚠️ Failed to read student profiles from MongoDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// Data Operations: Learning Progress & Mastery
// ----------------------------------------------------
export async function saveLearningProgressMongo(progressItem: {
  userId: string;
  subject: string;
  topic: string;
  masteryLevel: number;
  date?: string;
}): Promise<boolean> {
  if (!database || !progressItem.userId) return false;
  try {
    const doc = {
      ...progressItem,
      date: progressItem.date || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };
    await database.collection('learning_progress').updateOne(
      { userId: progressItem.userId, subject: progressItem.subject, topic: progressItem.topic },
      { $set: doc },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save learning progress to MongoDB:', err);
    return false;
  }
}

export async function getLearningProgressMongo(userId: string): Promise<any[]> {
  if (!database || !userId) return [];
  try {
    return await database.collection('learning_progress').find({ userId }).toArray();
  } catch (err) {
    console.warn('⚠️ Failed to read learning progress from MongoDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// Verification: Live Test Record Creation & Retrieval
// ----------------------------------------------------
export async function createVerificationRecordMongo(details: {
  triggeredBy: string;
  purpose: string;
  testNote?: string;
}): Promise<any> {
  if (!database) {
    throw new Error('MongoDB Atlas is not connected. Check MONGODB_URI configuration.');
  }

  const record = {
    testId: `TEST-MONGO-${Date.now().toString(36).toUpperCase()}`,
    purpose: details.purpose || 'Live MongoDB Atlas Connectivity Verification',
    triggeredBy: details.triggeredBy || 'AI Studio Student Portal',
    testNote: details.testNote || 'Real verified database write to MongoDB Atlas cluster',
    createdAt: new Date().toISOString(),
    clientTimestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    serverUptimeSeconds: Math.floor(process.uptime()),
    status: 'CONFIRMED_WRITTEN_TO_ATLAS',
  };

  const result = await database.collection('verification_records').insertOne(record);
  return {
    ...record,
    _id: result.insertedId.toString(),
  };
}

export async function getRecentVerifiedRecordsMongo(limit = 10): Promise<{
  verificationRecords: any[];
  messages: any[];
  quizResults: any[];
  profiles: any[];
  progress: any[];
}> {
  if (!database) {
    return {
      verificationRecords: [],
      messages: [],
      quizResults: [],
      profiles: [],
      progress: [],
    };
  }

  try {
    const [verificationRecords, messages, quizResults, profiles, progress] = await Promise.all([
      database.collection('verification_records').find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      database.collection('messages').find({}).sort({ timestamp: -1 }).limit(limit).toArray(),
      database.collection('quiz_results').find({}).sort({ savedToMongoAt: -1 }).limit(limit).toArray(),
      database.collection('student_profiles').find({}).sort({ updatedAt: -1 }).limit(limit).toArray(),
      database.collection('learning_progress').find({}).sort({ updatedAt: -1 }).limit(limit).toArray(),
    ]);

    return {
      verificationRecords,
      messages,
      quizResults,
      profiles,
      progress,
    };
  } catch (err) {
    console.warn('⚠️ Failed to fetch recent verification records from MongoDB:', err);
    return {
      verificationRecords: [],
      messages: [],
      quizResults: [],
      profiles: [],
      progress: [],
    };
  }
}
