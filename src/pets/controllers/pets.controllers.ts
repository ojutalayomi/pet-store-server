import { Request, Response } from 'express';
import * as petsModel from '../models/pets.prod.model'
import { Payload, verifyToken } from '../../users/models/users.prod.model';
import { User } from '../../types/type';

export const getPet = async (req: Request, res: Response) => {
    try {
        const resp = await petsModel.getItem(req.params.id)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const getPets = async (req: Request, res: Response) => {
    try {
        // console.log(req.query)
        const { query } = req.query

        if (!query) res.status(400).json({ error: 'Query parameter is required' });

        const resp = await petsModel.getItems(decodeURIComponent(query as string))

        if (!resp) res.status(401).json({ error: 'No pets found' });

        // console.log(resp)

        if (resp) res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const listPets = async (req: Request, res: Response) => {
    try {
        const resp = await petsModel.listItems()
        // console.log(resp)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const editPet = async (req: Request, res: Response) => {
    try {
        const resp = await petsModel.editItem(req.params.id, req.body)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const addPet = async (req: Request, res: Response) => {
    try {
        const resp = await petsModel.addItem(req.body)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const adoptionApplication = async (req: Request, res: Response) => {
    try {
        const cookie = req.cookies.pt_session || (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1];
        if (!cookie) {
            res.status(401).json({ message: "Not logged in. Session cookie missing." });
            return
        }

        // Decode and clean the cookie value
        const decodedCookie = decodeURIComponent(cookie).replace(/"/g, '');

        // Step 2: Verify the token
        const payload = await verifyToken(decodedCookie) as unknown as Payload;
        if (!payload) {
            res.status(401).json({ message: "Invalid token. Please log in." });
            return
        }
        const resp = await petsModel.addAdoptionApplication( req.body, payload._id )
        if (resp) {
            res.status(200).json(resp)
            return
        }

    } catch (err) {
        if (err instanceof Error) {
            res.status(500).json(err.message)
            return
        }
    }
}

export const adoptionApplicationList = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const role = authHeader?.split(' ')[1];
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        // if (!cookies) return res.status(405).end(`Not Allowed`);
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload) {
            res.status(401).json(`Not Allowed`);
            return
        }
        const resp = await petsModel.addAdoptionApplicationList(payload._id, role as User['role'])
        if (resp) {
            res.status(200).json(resp)
            return
        }

    } catch (err) {
        if (err instanceof Error) {
            res.status(500).json(err)
            return
        }
    }
}

export const editAdoptionApplicationController = async (req: Request, res: Response) => {
    try {
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        // if (!cookies) return res.status(405).end(`Not Allowed`);
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload) {
            res.status(401).json(`Not Allowed`);
            return
        }
        const resp = await petsModel.editAdoptionApplication(req.params.id, req.body)
        res.status(200).json(resp)
    } catch (err) {
        res.status(500).send(err)
    }
}

export const deletePet = async (req: Request, res: Response) => {
    try {
        const resp = await petsModel.deleteItem(req.params.id)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const EmergencyCare = async (req: Request, res: Response) => {
    try {
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload._id) {
            res.status(401).json(`Not Allowed`);
            return
        }
        req.body.ownerId = payload._id
        const resp = await petsModel.emergencyCare(req.body)
        res.status(200).json(resp)

    } catch (err) {
        res.status(500).send(err)
    }
}

export const emergencyCareList = async (req: Request, res: Response) => {
    try {
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload._id) {
            res.status(401).json(`Not Allowed`);
            return
        }
        const resp = await petsModel.emergencyCareList(payload, req.query.all as string)
        res.status(200).json(resp)
        return
    } catch (err) {
        res.status(500).send(err)
    }
}

export const emergencyCareEdit = async (req: Request, res: Response) => {
    try {
        if (!req.params.id) {
            res.status(400).json({ message: 'ID is required' });
            return
        }
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload._id) {
            res.status(401).json(`Not Allowed`);
            return
        }
        if (payload.role !== 'admin' && payload.role !== 'foster-caregiver') {
            res.status(401).json({ message: 'Unauthorized' });
            return
        }
        // if caregiver, ensure they are assigned to this request
        if (payload.role === 'foster-caregiver') {
            const existing = await petsModel.getEmergencyCareById(req.params.id);
            if (!existing) {
                res.status(404).json({ message: 'Emergency care request not found' });
                return
            }
            if ((existing as any).caregiverId && (existing as any).caregiverId !== payload._id) {
                res.status(403).json({ message: 'Forbidden: not assigned caregiver' });
                return
            }
        }
        const resp = await petsModel.emergencyCareEdit(req.params.id, req.body)
        res.status(200).json(resp)
        return
    } catch (err) {
        res.status(500).send(err)
    }
}

export const emergencyCareAssignCaregiver = async (req: Request, res: Response) => {
    try {
        if (!req.params.id) {
            res.status(400).json({ message: 'ID is required' });
            return
        }
        const { caregiverId } = req.body as { caregiverId?: string };
        if (!caregiverId) {
            res.status(400).json({ message: 'caregiverId is required' });
            return
        }
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
        if (!payload._id) {
            res.status(401).json(`Not Allowed`);
            return
        }
        const existing = await petsModel.getEmergencyCareById(req.params.id);
        if (!existing) {
            res.status(404).json({ message: 'Emergency care request not found' });
            return
        }
        // admins can assign anyone; caregivers can only self-assign if unassigned
        if (payload.role === 'admin') {
            const resp = await petsModel.assignEmergencyCareCaregiver(req.params.id, caregiverId);
            res.status(200).json(resp);
            return
        }
        if (payload.role === 'foster-caregiver') {
            if ((existing as any).caregiverId && (existing as any).caregiverId !== payload._id) {
                res.status(403).json({ message: 'Forbidden: already assigned to another caregiver' });
                return
            }
            if (caregiverId !== payload._id) {
                res.status(403).json({ message: 'Forbidden: can only self-assign' });
                return
            }
            const resp = await petsModel.assignEmergencyCareCaregiver(req.params.id, payload._id);
            res.status(200).json(resp);
            return
        }
        res.status(401).json({ message: 'Unauthorized' });
        return
    } catch (err) {
        res.status(500).send(err)
    }
}