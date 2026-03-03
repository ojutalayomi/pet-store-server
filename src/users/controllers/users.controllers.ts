import * as Models from "../models/users.prod.model";
import { Request, Response } from 'express';
import validator from 'validator'
import crypto from 'crypto'
import transporter from "../../utils/email";

export const getUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        
        const resp = await Models.getUser(email, password, req.headers['user-agent']);

        
        res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error && err.message === 'User not found') res.status(404).json(err);
        else res.status(500).json(err);
    }
};

export const user = async (req: Request, res: Response): Promise<void> => {
    try {
        // Step 1: Extract the token from cookies
        const cookie = req.cookies.pt_session || (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1];
        if (!cookie) {
            res.status(401).json({ message: "Not logged in. Session cookie missing." });
        }

        // Decode and clean the cookie value
        const decodedCookie = decodeURIComponent(cookie).replace(/"/g, '');

        // Step 2: Verify the token
        const payload = await Models.verifyToken(decodedCookie) as unknown as Models.Payload;
        if (!payload) {
            res.status(401).json({ message: "Invalid token. Please log in." });
        }

        // Step 3: Retrieve user details from the database using the payload
        const user = await Models.findUser(payload._id);
        if (!user) {
            res.status(404).json({ message: "User not found." });
        }

        // Step 4: Return user data
        res.status(200).json(user);
    } catch (err) {
        if (err instanceof Error && err.message === 'User not found') res.status(404).json({ error: err.message })
    }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.listUsers();
        res.status(200).json(resp);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const listPetInteractions = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.listPetInteractions(req.params.userId);
        res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error && err.message === "You don't have pet interactions") {
            res.status(404).json(err)
            return
        };
        res.status(500).json(err);
    }
};

export const editUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const cookie = req.cookies.pt_session || (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1];
        if (!cookie) {
            res.status(401).json({ message: "Not logged in. Session cookie missing." });
            return;
        }

        // Decode and clean the cookie value
        const decodedCookie = decodeURIComponent(cookie).replace(/"/g, '');

        // Step 2: Verify the token
        const payload = await Models.verifyToken(decodedCookie) as unknown as Models.Payload;
        if (!payload) {
            res.status(401).json({ message: "Invalid token. Please log in." });
            return;
        }
        
        const resp = await Models.editUser((req.query.id ? req.query.id as string : payload._id), req);
        
        if (resp) {
            res.status(200).json(resp);
            return;
        }
    } catch (err) {
        if (err instanceof Error && err.message === 'User not found') {
            res.status(404).json(err)
            return
        };
    }
};

export const addUser = async (req: Request, res: Response): Promise<void> => {
    try {
        if(req.body.email === 'admin@admin.com') {
            res.status(400).json({ error: 'Invalid email address' });
            return;
        }

        if (!validator.isEmail(req.body.email)) {
            res.status(400).json({ error: 'Invalid email address' });
            return;
        }

        try {
            const resp = await Models.addUser(req);

            res.status(200).json(resp);
        } catch (error) {
            if (error instanceof Error && error.message === 'Email already exists') {
                res.status(403).json({ error: error.message });
                return;
            }
            throw error;
        }
    } catch (err: unknown) {
        console.error('Error in addUser:', err);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'An unknown error occurred'
        });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader2 = (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1]
        const cookie = decodeURIComponent(req.cookies.pt_session ? req.cookies.pt_session : authHeader2 ? authHeader2 : '').replace(/"/g, '');
        // if (!cookies) return res.status(405).end(`Not Allowed`);
        const payload = await Models.verifyToken(cookie as unknown as string) as unknown as Models.Payload;
        // console.log(payload)
        if (!payload) res.status(401).json(`Not Allowed`);
        const resp = await Models.deleteUser(req.params.id);
        if (resp.success) res.status(200).json(resp);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const inviteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.createInvite(req.body.name, req.body.email, req.body.role);
        if (resp.success) res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error) {
            if (err.message === 'User already has admin role') res.status(400).json({ error: err.message });
        }
    }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!validator.isEmail(email)) {
            res.status(400).json({ error: 'Invalid email address' });
            return;
        }

        // Generate reset token (valid for 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store token and expiry with user record
        // Note: Implementation of updateUserResetToken would be needed in data layer
        try {
            await Models.updateUserResetToken(email, resetToken, resetTokenExpiry);
        } catch (error) {
            if (error instanceof Error && error.message === 'User not found') {
                // Don't reveal if email exists or not for security
                res.status(200).json({ message: 'If an account exists with that email, a password reset link has been sent.' });
                return;
            }
            throw error;
        }

        // Send reset email
        const resetLink = `${process.env.FRONTEND_URL}/accounts/reset-password?token=${resetToken}`;
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        res.status(200).json({ 
            message: 'If an account exists with that email, a password reset link has been sent.'
        });

    } catch (err: unknown) {
        console.error('Error in requestPasswordReset:', err);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'An unknown error occurred'
        });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Verify token and update password
        // Note: Implementation of verifyResetTokenAndUpdatePassword would be needed in data layer
        try {
            await Models.verifyResetTokenAndUpdatePassword(token, newPassword);
            res.status(200).json({ message: 'Password successfully reset' });
        } catch (error) {
            if (error instanceof Error && 
                (error.message === 'Invalid or expired token' || error.message === 'User not found')) {
                res.status(400).json({ error: error.message });
                return;
            }
            throw error;
        }

    } catch (err: unknown) {
        console.error('Error in resetPassword:', err);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'An unknown error occurred'
        });
    }
};

export const handleEmailConfirmationRoute = async (req: Request, res: Response): Promise<void> => {
    try {
        // console.log(req.body.code)
        if (req.body.code) {
            const email = req.body.email
            const resp = await Models.sendEmailConfirmationCode(email);
            res.status(200).json(resp);
        } else {
            const { otp, email } = req.body
            const resp = await Models.verifyEmailConfirmationCode(email, otp);
            res.status(200).json(resp);
        }
    } catch (err) {
        if (err instanceof Error && (err.message === 'User not found' || err.message.includes('code'))) res.status(404).json({ error: err.message })
        else res.status(500).json(err);
    }
}

export const scheduleVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const cookie = req.cookies.pt_session || (req.headers?.['X-Secondary-Authorization'] as string)?.split(" ")[1];
        if (!cookie) {
            res.status(401).json({ message: "Not logged in. Session cookie missing." });
            return;
        }

        // Decode and clean the cookie value
        const decodedCookie = decodeURIComponent(cookie).replace(/"/g, '');

        // Step 2: Verify the token
        const payload = await Models.verifyToken(decodedCookie) as unknown as Models.Payload;
        if (!payload) {
            res.status(401).json({ message: "Invalid token. Please log in." });
            return;
        }
        const resp = await Models.scheduleVisit(req.body.name, req.body.email, payload._id, req.body.visitDateAndTime, req.body.notes);
        res.status(200).json(resp);
        return;
    } catch (err) {
        if (err instanceof Error) res.status(500).json(err);
        else res.status(500).json(err);
    }
}

export const listVisits = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.listVisits(req.body.userId);
        res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error) res.status(500).json(err);
        else res.status(500).json(err);
    }
}

export const updateVisitStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.updateVisitStatus(req.body.visitId, req.body.status);
        res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error) res.status(500).json(err);
        else res.status(500).json(err);
    }
}

export const getVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const resp = await Models.getVisit(req.body.visitId);
        res.status(200).json(resp);
    } catch (err) {
        if (err instanceof Error) res.status(500).json(err);
        else res.status(500).json(err);
    }
}