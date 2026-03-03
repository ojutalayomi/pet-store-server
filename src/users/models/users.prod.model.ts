import { Db, Collection, Document, ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Invite, User } from '../../types/type';
import { SignJWT } from "jose";
import { UAParser } from 'ua-parser-js';
import { Request } from 'express';
import { callSuccess, emailChangedNotification, sendCodeByEmail, sendInviteEmail, sendScheduleVisitEmail } from '../../utils/email';
import MongoDBClient from '../../config/database';

type _ = { userId: string, petId: string };

const db = new MongoDBClient().init();
// Collections
let Users: Collection<User>;
let Tokens: Collection<Document>;
let PetInteractions: Collection<Document>;
let SignInTokens: Collection<Document>;
let Confirmations: Collection<Document>;
let Invites: Collection<Invite>;
(async () => {
    // Collection
    Users = (await db).getUsersCollection();
    Tokens = (await db).getTokensCollection();
    PetInteractions = (await db).getPetInteractionsCollection();
    SignInTokens = (await db).getSignInTokensCollection();
    Confirmations = (await db).getConfirmationsCollection();
    Invites = (await db).getInvitesCollection();
    // Create indexes after collection is initialized
    await createIndexes();
})();

const saltRounds = 10;

export function secretKey(){
    return crypto.randomBytes(10).toString('hex');
}

export interface Payload {
    _id: string,
    exp: number,
    role: 'adopter' | 'pet-owner' | 'foster-caregiver' | 'admin'
}

// Helper functions remain the same
export async function verifyToken(token: string) {
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (error) {
        return null;
    }
}

export const getUser = async (email: string, password: string, headers: any) => {
    try {
        const expirationTime = new Date();
        expirationTime.setDate(expirationTime.getDate() + 1);

        const user = await Users.findOne({ email });
        if (!user) throw new Error('User not found');

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw Error('Invalid password');
        }
        delete (user as Partial<User>).password;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ _id: user._id.toString(), role: user.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('15d')
            .sign(secret);

        const parser = new UAParser(headers);
        const deviceInfo = parser.getResult();

        await SignInTokens.insertOne({
            userId: user._id,
            token,
            deviceInfo,
            createdAt: new Date()
        });

        return { user, expirationTime, token };
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const listUsers = async () => {
    try {
        return await Users.find({}).toArray();
    } catch (err) {
        console.log('Error', err);
    }
}

export const listPetInteractions = async (userId: string) => {
    try {
        const petInteractionsList = await PetInteractions.find({ userId: userId }).filter({ petId: 1, _id: 0 }).toArray()
        if (petInteractionsList) {
            // Extract petIds from petInteractionsList and use $in properly in a $match stage
            const petIds = petInteractionsList.map((interaction: any) => interaction.petId);
            const pets = await (await db).getPetsCollection()
                .find({ _id: { $in: petIds } })
                .toArray();
            return pets;
        }
        throw Error("You don't have pet interactions");
    } catch (err) {
        console.log('Error', err);
    }
}

export const findUser = async (id: string): Promise<Partial<User>> => {
    try {
        const user = await Users.findOne({ _id: new ObjectId(id) });
        if (!user) throw new Error('User not found');
        delete (user as Partial<User>).password;
        return user;
    } catch (err) {
        throw err;
    }
}

export const editUser = async (id: string, req: Request) => {
    try {
        const { body: data, headers } = req;

        const authHeader = headers.authorization;
        const inviteToken = authHeader?.split(' ')[1];
        if (inviteToken) {
            const existingInvite: Invite | null = await Invites.findOne({ token: inviteToken });
            if (!existingInvite) {
                throw new Error('Invalid invite token');
            }
            if (existingInvite.expiresAt < new Date().toISOString()) {
                throw new Error('Invite expired');
            }
            data.role = existingInvite.role;
            await deleteInvite(inviteToken);
        }

        const user = await Users.findOne({ _id: new ObjectId(id) });
        if (!user) throw new Error('User not found');

        if (data.password) {
            const passwordMatch = data.oldPassword && await bcrypt.compare(data.oldPassword, user.password);
            if (!passwordMatch) {
                throw Error('Invalid password');
            }
            data.password = await bcrypt.hash(data.password, saltRounds);
        }

        const updatedUser = await Users.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date().toISOString() } },
            { returnDocument: 'after' }
        );

        delete (updatedUser as Partial<User>)?.password;
        return updatedUser;
    } catch (err) {
        console.log('Error', err);
        throw err;
    }
}

export const addUser = async (req: Request) => {
    try {
        const { body: data, headers } = req;

        const authHeader = headers.authorization;
        const inviteToken = authHeader?.split(' ')[1];
        if (inviteToken) {
            const existingInvite: Invite | null = await Invites.findOne({ token: inviteToken });
            if (!existingInvite) {
                throw new Error('Invalid invite token');
            }
            if (existingInvite.expiresAt < new Date().toISOString()) {
                throw new Error('Invite expired');
            }
            data.role = existingInvite.role;
            await deleteInvite(inviteToken);
        }

        const existingUser = await Users.findOne({ email: data.email });
        if (existingUser) {
            throw new Error('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        const newUser = { 
            ...data, 
            password: hashedPassword,
            _id: new ObjectId()
        };

        await Users.insertOne(newUser);

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ _id: newUser._id.toString() })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('15d')
            .sign(secret);

        const parser = new UAParser(req.headers['user-agent']);
        const deviceInfo = parser.getResult();

        await SignInTokens.insertOne({
            userId: newUser._id,
            token,
            deviceInfo,
            createdAt: new Date()
        });

        await callSuccess(newUser.firstName, newUser.lastName, newUser.email);

        delete newUser.password;
        return { 
            newUser, 
            expirationTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 
            token 
        };
    } catch (err) {
        throw err;
    }
}

export const deleteUser = async (id: string) => {
    try {
        const result = await Users.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            throw new Error('User not found');
        }
        
        // Clean up related records
        await SignInTokens.deleteMany({ userId: new ObjectId(id) });
        await Tokens.deleteMany({ id: new ObjectId(id) });
        await Confirmations.deleteMany({ id: new ObjectId(id) });
        
        return { success: true };
    } catch (error) {
        console.log('Error', error);
        throw error;
    }
}

export const createInvite = async (name: string, email: string, role: Invite['role']) => {
    try {
        const token = crypto.randomBytes(16).toString('hex');
        let link = `${process.env.FRONTEND_URL}/admin/invite?token=${token}`;

        const existingUser: User | null = await Users.findOne({ email });
        if (existingUser) {
            if (existingUser.role === role) {
                throw new Error(`User already has ${role} role`);
            } else {
                link = `${process.env.FRONTEND_URL}/admin/invite?id=${existingUser.id}&token=${token}`;
            }
        }

        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        await Invites.insertOne({
            token,
            email,
            role,
            createdAt: new Date().toISOString(),
            expiresAt
        });

        await sendInviteEmail(name, email, role, link, expiresAt);
        return { success: true };

    } catch (err) {
        throw err;
    }
}

export const deleteInvite = async (token: string) => {
    await Invites.deleteOne({ token });
}

export const updateUserResetToken = async (
    email: string, 
    resetToken: string, 
    resetTokenExpiry: Date
): Promise<void> => {
    try {
        const user = await Users.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        await Tokens.insertOne({
            userId: user._id,
            resetToken,
            resetTokenExpiry
        });
    } catch (err) {
        throw err;
    }
};

export const verifyResetTokenAndUpdatePassword = async (
    resetToken: string,
    newPassword: string
): Promise<void> => {
    try {
        const tokenRecord = await Tokens.findOne({ 
            resetToken,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!tokenRecord) {
            throw new Error('Invalid or expired reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        const result = await Users.updateOne(
            { _id: tokenRecord.userId },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            throw new Error('User not found');
        }

        // Remove the used token
        await Tokens.deleteOne({ resetToken });
    } catch (err) {
        throw err;
    }
};

export const sendEmailConfirmationCode = async (
    email: string
): Promise<string> => {
    try {
        const user = await Users.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const confirmationExpiry = new Date(Date.now() + 30 * 60 * 1000);

        // Replace any existing confirmation code
        await Confirmations.updateOne(
            { userId: user._id },
            {
                $set: {
                    userId: user._id,
                    confirmationCode,
                    confirmationExpiry
                }
            },
            { upsert: true }
        );

        await sendCodeByEmail(user.firstName, user.lastName, user.email, confirmationCode);

        return 'Sent';
    } catch (err) {
        throw err;
    }
};

export const verifyEmailConfirmationCode = async (
    email: string,
    code: string
): Promise<[boolean, string]> => {
    try {
        const user = await Users.findOne({ email }) as User & { _id: ObjectId };
        // console.log(user)
        if (!user) {
            throw new Error('User not found');
        }

        const confirmationRecord = await Confirmations.findOne({
            userId: user._id,
            confirmationExpiry: { $gt: new Date() }
        });

        if (!confirmationRecord) {
            throw new Error('No confirmation code found or code expired');
        }

        if (confirmationRecord.confirmationCode !== code) {
            throw new Error('Invalid confirmation code');
        }

        // Update user's verification status
        const lastUpdated = new Date().toISOString();
        await Users.updateOne(
            { _id: user._id },
            {
                $set: {
                    'status': 'active',
                    'verificationStatus.emailVerified': true,
                    'accountDetails.lastUpdated': lastUpdated
                }
            }
        );

        // Remove the used confirmation code
        await Confirmations.deleteOne({ _id: confirmationRecord._id });

        await emailChangedNotification(user.firstName, user.lastName, user.email);

        return [true, lastUpdated];
    } catch (err) {
        throw err;
    }
};

export const scheduleVisit = async (
    name: string,
    email: string,
    userId: string,
    visitDateAndTime: string,
    notes: string
): Promise<any> => {
    try {
        // Validate user exists
        const user = await Users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            throw new Error('User not found');
        }

        // Create visit record
        const visit = {
            userId: new ObjectId(userId),
            name,
            email,
            visitDateAndTime,
            notes: notes,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert into visits collection
        const result = await (await db).getVisitsCollection().insertOne(visit);

        await sendScheduleVisitEmail(user.firstName, user.lastName, user.email, visitDateAndTime, notes, 'pending');

        return {
            _id: result.insertedId,
            ...visit
        };

    } catch (err) {
        throw err;
    }
};

export const getVisit = async (visitId: string) => {
    try {
        const visit = await (await db).getVisitsCollection().findOne({
            _id: new ObjectId(visitId)
        });
        
        if (!visit) {
            throw new Error('Visit not found');
        }

        return visit;
    } catch (err) {
        throw err;
    }
};

export const updateVisitStatus = async (
    visitId: string,
    status: 'approved' | 'rejected' | 'cancelled' | 'completed'
) => {
    try {
        const result = await (await db).getVisitsCollection().updateOne(
            { _id: new ObjectId(visitId) },
            { 
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error('Visit not found');
        }

        return result;
    } catch (err) {
        throw err;
    }
};

export const listVisits = async (userId: string) => {
    try {
        if (!userId) {
                return await (await db).getVisitsCollection().find({}).toArray();
        }
        return await (await db).getVisitsCollection().find({
            userId: new ObjectId(userId)
        }).toArray();
    } catch (err) {
        throw err;
    }
};


// Add TTL indexes for automatic cleanup of expired tokens and confirmations
async function createIndexes() {
    try {
        await Tokens.createIndex(
            { resetTokenExpiry: 1 }, 
            { expireAfterSeconds: 0 }
        );
        
        await Confirmations.createIndex(
            { confirmationExpiry: 1 }, 
            { expireAfterSeconds: 0 }
        );

        await SignInTokens.createIndex(
            { createdAt: 1 }, 
            { expireAfterSeconds: 15 * 24 * 60 * 60 } // 15 days
        );

        await Users.createIndex(
            { email: 1 }, 
            { unique: true }
        );
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

// Call this every 24 hours to ensure indexes are maintained
setInterval(createIndexes, 24 * 60 * 60 * 1000);

interface TokenRecord {
    userId: ObjectId;
    resetToken: string;
    resetTokenExpiry: Date;
}

interface ConfirmationRecord {
    userId: ObjectId;
    confirmationCode: string;
    confirmationExpiry: Date;
}

interface SignInToken {
    userId: ObjectId;
    token: string;
    deviceInfo: UAParser.IResult;
    createdAt: Date;
}