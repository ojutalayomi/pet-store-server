import express from "express";
import {
  listPets,
  getPet,
  editPet,
  addPet,
  deletePet,
  getPets,
  adoptionApplication,
  adoptionApplicationList,
  editAdoptionApplicationController,
  EmergencyCare,
  emergencyCareList,
  emergencyCareEdit,
  emergencyCareAssignCaregiver,
} from "../controllers/pets.controllers";

const router = express.Router();

/**
 * @swagger
 * components:
 *  schemas:
 *    Pet:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: Pet id
 *        name:
 *          type: string
 *          description: Pet name
 *        age:
 *          type: integer
 *          description: Pet age
 *        type:
 *          type: string
 *          description: Pet type
 *        breed:
 *          type: string
 *          description: Pet breed
 *        image:
 *          type: string
 *          description: Pet image
 *        status:
 *          type: boolean
 *          description: Pet status
 *        traits:
 *          type: array
 *          items:
 *            type: string
 *          description: Pet traits
 *        medicalHistory:
 *          type: object
 *          properties:
 *            vaccinated:
 *              type: boolean
 *            neutered:
 *              type: boolean
 *            lastCheckup:
 *              type: string
 *              format: date
 *          description: Pet medical history
 *      example:
 *        id: 1
 *        name: Rexaurus
 *        age: 3
 *        breed: labrador
 *        type: dog
 *        image: https://images.unsplash.com/photo-1574158622687-2aa7a1c9c6f2
 *        status: adopted
 *        traits: ["curious", "affectionate"]
 *        medicalHistory:
 *          vaccinated: true
 *          neutered: false
 *          lastCheckup: "2024-02-20"
 */

/**
 * @swagger
 * components:
 *  schemas:
 *    EmergencyCare:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        ownerId:
 *          type: string
 *          description: Requesting user's id
 *        caregiverId:
 *          type: string
 *          nullable: true
 *          description: Assigned foster caregiver's id
 *        petData:
 *          $ref: '#/components/schemas/Pet'
 *        ownerName:
 *          type: string
 *        phone:
 *          type: string
 *        description:
 *          type: string
 *        status:
 *          type: string
 *          enum: [pending, approved, confirmed, completed, rejected]
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */

/**
 * @swagger
 * /pets:
 *  get:
 *    summary: Get all pets
 *    description: Get all pets
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.get("/", listPets);

/**
 * @swagger
 * /pets/search:
 *  get:
 *    summary: Search pets
 *    description: Search pets by a single query term
 *    parameters:
 *      - in: query
 *        name: query
 *        schema:
 *          type: string
 *        description: Search term to find pets (searches across type, breed, name, and traits)
 *        example: "dog"
 *    responses:
 *      200:
 *        description: Success
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Pet'
 *      500:
 *        description: Internal Server Error
 */
router.get("/search", getPets);

/**
 * @swagger
 * /pets:
 *  post:
 *    summary: Add pet
 *    description: Add pet
 *    requestBody:
 *      description: A JSON object containing pet information
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Pet'
 *          example:
 *            name: Rexaurus
 *            age: 12
 *            breed: labrador
 *            type: dog
 *            image: https://images.unsplash.com/photo-1574158622687-2aa7a1c9c6f2
 *            status: adopted
 *            traits: ["curious", "affectionate"]
 *            medicalHistory:
 *              vaccinated: true
 *              neutered: false
 *              lastCheckup: "2024-02-20"
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.post("/", addPet);

router.get("/adoption-applications", adoptionApplicationList);

router.post("/adoption-application", adoptionApplication);

router.put("/adoption-application/:id", editAdoptionApplicationController);

router.post("/emergency-care", EmergencyCare);

router.get("/emergency-care", emergencyCareList);

router.put("/emergency-care/:id", emergencyCareEdit);

/**
 * @swagger
 * /pets/emergency-care/{id}/assign:
 *   put:
 *     summary: Assign a caregiver to an emergency-care request
 *     description: Admins can assign any caregiver. Foster-caregivers can self-assign only if the request is unassigned.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Emergency-care request id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caregiverId:
 *                 type: string
 *           example:
 *             caregiverId: "65f0c6c8d5f3b2a1e4c1a2b3"
 *     responses:
 *       200:
 *         description: Assignment updated
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Emergency-care request not found
 */
// assign caregiver to an emergency-care request
router.put("/emergency-care/:id/assign", emergencyCareAssignCaregiver);

/**
 * @swagger
 * /pets/{id}:
 *  get:
 *    summary: Get pet detail
 *    description: Get pet detail
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Pet id
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.get("/:id", getPet);

/**
 * @swagger
 * /pets/{id}:
 *  put:
 *    summary: Edit pet
 *    description: Edit pet
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Pet id
 *    requestBody:
 *      description: A JSON object containing pet information
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Pet'
 *          example:
 *            name: Rexaurus
 *            age: 12
 *            breed: labrador
 *            type: dog
 *            image: https://images.unsplash.com/photo-1574158622687-2aa7a1c9c6f2
 *            status: adopted
 *            traits: ["curious", "affectionate"]
 *            medicalHistory:
 *              vaccinated: true
 *              neutered: false
 *              lastCheckup: "2024-02-20"
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.put("/:id", editPet);

/**
 * @swagger
 * /pets/{id}:
 *  delete:
 *    summary: Delete pet
 *    description: Delete pet
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Pet id
 *    responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Internal Server Error
 */
router.delete("/:id", deletePet);

export default router;
