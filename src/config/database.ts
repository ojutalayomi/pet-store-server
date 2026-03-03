import { Db, MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { AdoptionApplication, EmergencyDetails, Invite, PetProfile, User } from '../types/type';

dotenv.config();

// Connection URL from environment variable with fallback
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
const uri = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
  },
  connectTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 30000,
};

function ensureClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    if (!uri) {
      throw new Error('Please add your MongoDB URI to .env');
    }
    if (process.env.NODE_ENV === 'development') {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>
      };
      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }
  return clientPromise!;
}

export async function getMongoClient() {
  const promise = ensureClientPromise();
  if (!client || !client.connect) {
    client = await promise;
  }
  return client;
}

/**
 * Client class for interacting with MongoDB collections
 */
export default class MongoDBClient {
  private client!: MongoClient;
  private db!: Db;

  /**
   * Creates a new MongoDB client instance
   * @param dbName Database name from env vars or empty string
   */
  constructor(private dbName: string = process.env.MONGODB_DATABASE || '') {}

  /**
   * Initializes the MongoDB connection
   * @returns This client instance
   */
  async init() {
    this.client = await getMongoClient();
    this.db = this.client.db(this.dbName || undefined);
    return this;
  }

  /**
   * Gets the MongoDB database instance
   * @returns The database instance
   */
  async getDb() {
    return this.db;
  }

  async getCollection(collectionName: string) {
    return this.db.collection(collectionName);
  }

  /**
   * Returns the USERS collection
   */
  getUsersCollection() {
    return this.db.collection<User>('USERS');
  }

  /**
   * Returns the TOKENS collection
   */
  getTokensCollection() {
    return this.db.collection('TOKENS');
  }

  /**
   * Returns the PET_INTERACTIONS collection
   */
  getPetInteractionsCollection() {
    return this.db.collection('PET_INTERACTIONS');
  }

  /**
   * Returns the SIGN_IN_TOKENS collection
   */
  getSignInTokensCollection() {
    return this.db.collection('SIGN_IN_TOKENS');
  }

  /**
   * Returns the CONFIRMATIONS collection
   */
  getConfirmationsCollection() {
    return this.db.collection('CONFIRMATIONS');
  }

  /**
   * Returns the INVITES collection
   */
  getInvitesCollection() {
    return this.db.collection<Invite>('INVITES');
  }

  /**
   * Returns the VISITS collection
   */
  getVisitsCollection() {
    return this.db.collection('VISITS');
  }

  /**
   * Returns the PETS collection
   */
  getPetsCollection() {
    return this.db.collection<PetProfile>('PETS');
  }

  /**
   * Returns the ADOPTIONS_APPLICATIONS collection
   */
  getAdoptionsApplicationsCollection() {
    return this.db.collection<AdoptionApplication>('ADOPTIONS_APPLICATIONS');
  }

  /**
   * Returns the EMERGENCY_CARE collection
   */
  getEmergencyCareCollection() {
    return this.db.collection<EmergencyDetails>('EMERGENCY_CARE');
  }

  async close() {
    await this.client.close();
  }
}
