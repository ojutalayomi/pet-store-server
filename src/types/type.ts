export interface PetProfile {
    id: string; 
    name: string;
    type: string;
    age: number;
    breed: string;
    image: string;
    status: 'available' | 'adopted' | 'fostered';
    traits: string[];
    medicalHistory: {
      vaccinated: boolean;
      neutered: boolean;
      lastCheckup: string;
    };
    notes: string;
}

export interface User {
    id: string;
    avatar: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    role: 'adopter' | 'pet-owner' | 'foster-caregiver' | 'admin';
    status: 'active' | 'inactive' | 'suspended';
    preferences: {
        notifications: boolean;
        emailUpdates: boolean;
        smsAlerts: boolean;
    };
    petInteractions: {
        adoptedPets: string[]; // Array of pet IDs
        fosteredPets: string[]; // Array of pet IDs
        favoritePets: string[]; // Array of pet IDs
    };
    verificationStatus: {
        emailVerified: boolean;
        phoneVerified: boolean;
        backgroundCheck: boolean;
        dateVerified?: string;
    };
    accountDetails: {
        dateCreated: string;
        lastLogin: string;
        lastUpdated: string;
        loginAttempts: number;
    };
}

export interface Invite {
    token: string;
    email: string;
    role: 'admin' | 'foster-caregiver';
    createdAt: string;
    expiresAt: string;
}

export interface AdoptionApplication {
    userId: string;
    petId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    housing: string;
    ownRent: string;
    landlordContact: string;
    occupation: string;
    otherPets: string;
    veterinarian: string;
    experience: string;
    reason: string;
    commitment: string;
    emergencyContact: string;
    references: string;
    createdAt: string;
    updatedAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'needs more info';
    notes: string;
}

export interface EmergencyDetails {
    petData: PetProfile
    ownerName: string
    phone: string
    description: string
    caregiverId?: string
}