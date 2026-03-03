import express from "express";
import {
  listUsers,
  listPetInteractions,
  getUser,
  editUser,
  addUser,
  deleteUser,
  requestPasswordReset,
  resetPassword,
  handleEmailConfirmationRoute,
  user,
  inviteUser,
  scheduleVisit,
  listVisits,
  updateVisitStatus,
  getVisit,
} from "../controllers/users.controllers";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         password:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         role:
 *           type: string
 *           enum: [admin, adopter, pet-owner, foster-caregiver]
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         preferences:
 *           type: object
 *           properties:
 *             notifications:
 *               type: boolean
 *             emailUpdates:
 *               type: boolean
 *             smsAlerts:
 *               type: boolean
 *         petInteractions:
 *           type: object
 *           properties:
 *             adoptedPets:
 *               type: array
 *               items:
 *                 type: string
 *             fosteredPets:
 *               type: array
 *               items:
 *                 type: string
 *             favoritePets:
 *               type: array
 *               items:
 *                 type: string
 *         verificationStatus:
 *           type: object
 *           properties:
 *             emailVerified:
 *               type: boolean
 *             phoneVerified:
 *               type: boolean
 *             backgroundCheck:
 *               type: boolean
 *             dateVerified:
 *               type: string
 *               format: date-time
 *         accountDetails:
 *           type: object
 *           properties:
 *             dateCreated:
 *               type: string
 *               format: date-time
 *             lastLogin:
 *               type: string
 *               format: date-time
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *             loginAttempts:
 *               type: integer
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get("/", listUsers);

router.get("/petInteractions/:userId", listPetInteractions);

/**
 * @swagger
 * /users/signin:
 *   post:
 *     summary: Get user detail by Email and password
 *     description: Retrieve detailed information for a specific user with password verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
router.post("/signin", getUser);

/**
 * @swagger
 * /users:
 *  post:
 *    summary: Add user
 *    description: Add user
 *    requestBody:
 *      description: A JSON object containing user information
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/User'
 *          example:
 *            firstName: "John"
 *            lastName: "Doe"
 *            email: "john.doe@example.com"
 *            phoneNumber: "+1234567890"
 *            password: "hashedPassword123"
 *            address:
 *              street: "123 Main St"
 *              city: "Anytown"
 *              state: "CA"
 *              zipCode: "12345"
 *              country: "USA"
 *            role: "adopter"
 *            status: "active"
 *            preferences:
 *              notifications: true
 *              emailUpdates: true
 *              smsAlerts: false
 *            petInteractions:
 *              adoptedPets: ["pet123", "pet456"]
 *              fosteredPets: ["pet789"]
 *              favoritePets: ["pet321"]
 *            verificationStatus:
 *              emailVerified: true
 *              phoneVerified: true
 *              backgroundCheck: false
 *              dateVerified: "2024-03-15T10:30:00Z"
 *            accountDetails:
 *              dateCreated: "2024-01-01T00:00:00Z"
 *              lastLogin: "2024-03-15T10:30:00Z"
 *              lastUpdated: "2024-03-15T10:30:00Z"
 *              loginAttempts: 0
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.post("/", addUser);

/**
 * @swagger
 * /users/reset-password:
 *  post:
 *    summary: Request password reset
 *    description: Send password reset email to user
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *    responses:
 *      200:
 *        description: Reset email sent successfully
 *      404:
 *        description: User not found
 *      500:
 *        description: Internal Server Error
 */
router.post("/reset-password", requestPasswordReset);

/**
 * @swagger
 * /users/reset-password/{token}:
 *  post:
 *    summary: Reset password
 *    description: Reset user password using token
 *    parameters:
 *      - in: path
 *        name: token
 *        schema:
 *          type: string
 *        required: true
 *        description: Password reset token
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              newPassword:
 *                type: string
 *    responses:
 *      200:
 *        description: Password reset successful
 *      400:
 *        description: Invalid or expired token
 *      500:
 *        description: Internal Server Error
 */
router.post("/reset-password/:token", resetPassword);

router.get("/get", user);

router.post("/invite", inviteUser);

router.post("/confirm-email", handleEmailConfirmationRoute);

router.post("/schedule-visit", scheduleVisit);

router.get("/list-visits", listVisits);

router.put("/update-visit-status", updateVisitStatus);

router.get("/get-visit/:visitId", getVisit);

/**
 * @swagger
 * /users/{id}:
 *  put:
 *    summary: Edit user
 *    description: Edit user
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: user id
 *    requestBody:
 *      description: A JSON object containing user information
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/user'
 *          example:
 *            firstName: "John"
 *            lastName: "Doe"
 *            email: "john.doe@example.com"
 *            phoneNumber: "+1234567890"
 *            password: "hashedPassword123"
 *            address:
 *              street: "123 Main St"
 *              city: "Anytown"
 *              state: "CA"
 *              zipCode: "12345"
 *              country: "USA"
 *            role: "adopter"
 *            status: "active"
 *            preferences:
 *              notifications: true
 *              emailUpdates: true
 *              smsAlerts: false
 *            petInteractions:
 *              adoptedPets: ["pet123", "pet456"]
 *              fosteredPets: ["pet789"]
 *              favoritePets: ["pet321"]
 *            verificationStatus:
 *              emailVerified: true
 *              phoneVerified: true
 *              backgroundCheck: false
 *              dateVerified: "2024-03-15T10:30:00Z"
 *            accountDetails:
 *              dateCreated: "2024-01-01T00:00:00Z"
 *              lastLogin: "2024-03-15T10:30:00Z"
 *              lastUpdated: "2024-03-15T10:30:00Z"
 *              loginAttempts: 0
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.put("/:id", editUser);

/**
 * @swagger
 * /users/{id}:
 *  delete:
 *    summary: Delete user
 *    description: Delete user from the system
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique identifier of the user
 *    responses:
 *      200:
 *        description: User successfully deleted
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: "User deleted successfully"
 *      404:
 *        description: User not found
 *      500:
 *        description: Internal Server Error
 */
router.delete("/:id", deleteUser);


export default router;