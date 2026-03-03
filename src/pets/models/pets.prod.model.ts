import { Collection, Document, ObjectId } from 'mongodb';
import { AdoptionApplication, EmergencyDetails, PetProfile, User } from '../../types/type';
import MongoDBClient from '../../config/database';
import { Payload } from '../../users/models/users.prod.model';

const db = new MongoDBClient().init();
let Pets: Collection<PetProfile>;
let AdoptionsApplications: Collection<AdoptionApplication>;
let EmergencyCare: Collection<EmergencyDetails>;
(async () => {
    // Collection
    Pets = (await db).getPetsCollection();
    AdoptionsApplications = (await db).getAdoptionsApplicationsCollection();
    EmergencyCare = (await db).getEmergencyCareCollection();
    // Create indexes after collection is initialized
    await createIndexes();
})();

export const getItem = async (id: string) => {
    try {
        const pet = await Pets.findOne({ _id: new ObjectId(id) });
        return pet;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const getItems = async (query: string) => {
    try {
        if (!query) {
            return await Pets.find({}).toArray();
        }

        const searchTerm = query.toLowerCase();
        const filteredPets = await Pets.find({
            $or: [
                { type: { $regex: searchTerm, $options: 'i' } },
                { breed: { $regex: searchTerm, $options: 'i' } },
                { name: { $regex: searchTerm, $options: 'i' } },
                { status: { $regex: searchTerm, $options: 'i' } }
            ]
        }).toArray();

        return filteredPets.length > 0 ? filteredPets : null;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const listItems = async (page: number = 1, limit: number = 20) => {
    try {
        const skip = (page - 1) * limit;
        const totalCount = await Pets.countDocuments({});
        const pets = await Pets.find({})
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(limit)
            .toArray();
        
        return {
            pets,
            pagination: {
                total: totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + pets.length < totalCount
            }
        };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const editItem = async (id: string, data: PetProfile) => {
    try {
        const result = await Pets.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date().toISOString() } },
            { returnDocument: 'after' }
        );

        if (!result) {
            throw new Error('Pet not found');
        }

        return result;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const addItem = async (data: Omit<PetProfile, '_id'>) => {
    try {
        const newPet = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const result = await Pets.insertOne(newPet);
        return {
            _id: result.insertedId,
            ...newPet
        };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const addAdoptionApplication = async (data: Omit<AdoptionApplication, '_id'> , userId: string) => {
    try {
        const newApplication: AdoptionApplication = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending',
            userId: userId
        };
        const result = await AdoptionsApplications.insertOne(newApplication);
        return { ...newApplication, _id: result.insertedId };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const addAdoptionApplicationList = async (
    userId: string, 
    role: User['role'],
    page: number = 1,
    itemsPerPage: number = 50
) => {
    try {
        // For adopters, only fetch their own applications
        if (role === 'adopter') {
            return await AdoptionsApplications.find({ userId }).toArray();
        }
        
        // For admin, fetch all applications with pagination
        const skip = (page - 1) * itemsPerPage;
        
        // Get total count for pagination info
        const totalCount = await AdoptionsApplications.countDocuments();
        
        const applications = await AdoptionsApplications
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage)
            .toArray();
            
        return {
            applications,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / itemsPerPage),
                totalItems: totalCount,
                itemsPerPage
            }
        };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const editAdoptionApplication = async (id: string, data: AdoptionApplication) => {
    try {
        const result = await AdoptionsApplications.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
        return result;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const deleteItem = async (id: string) => {
    try {
        const result = await Pets.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            throw new Error('Pet not found');
        }
        return { success: true, message: 'Pet deleted successfully' };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const emergencyCare = async (data: EmergencyDetails) => {
    try {
        const emergencyCareRequest = {
            ...data,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await EmergencyCare.insertOne(emergencyCareRequest);
        return {
            success: true,
            message: 'Emergency care request created successfully',
            data: result
        };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const emergencyCareList = async (payload: Payload, all?: string) => {
    try {
        if (payload.role === 'adopter' || payload.role === 'pet-owner') {
            return await EmergencyCare.find({ ownerId: payload._id }).toArray();
        }
        if (payload.role === 'foster-caregiver' && all === 'false') {
            return await EmergencyCare.find({ caregiverId: payload._id }).toArray();
        }
        // admin or explicit "all" request
        return await EmergencyCare.find({}).toArray();
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const emergencyCareEdit = async (id: string, data: EmergencyDetails) => {
    try {
        const result = await EmergencyCare.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
        return result;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const getEmergencyCareById = async (id: string) => {
    try {
        return await EmergencyCare.findOne({ _id: new ObjectId(id) });
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const assignEmergencyCareCaregiver = async (
    id: string,
    caregiverId: string
) => {
    try {
        const result = await EmergencyCare.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { caregiverId, updatedAt: new Date().toISOString() } },
            { returnDocument: 'after' }
        );
        return result;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

// Initialize indexes
async function createIndexes() {
    try {
        if (!Pets) {
            console.log('Collection not initialized yet');
            return;
        }
        // Create text indexes for search
        await Pets.createIndex({
            name: "text",
            type: "text",
            breed: "text",
            status: "text"
        });

        // Create regular indexes for common queries
        await Pets.createIndex({ type: 1 });
        await Pets.createIndex({ status: 1 });
        await Pets.createIndex({ createdAt: -1 });
        
        console.log('Indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}