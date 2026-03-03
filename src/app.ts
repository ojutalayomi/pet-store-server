import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import swaggerUI from 'swagger-ui-express'
import swaggerJSdoc from 'swagger-jsdoc'
import dotenv from 'dotenv'
import MongoDBClient from './config/database'
import { S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { timeFormatter } from './utils/time'
// Load environment variables
dotenv.config();

import petRoutes from './pets/routes/pets.route'
import userRoutes from './users/routes/users.route'
import paystackRoutes from './donations/routes/donations.route'

const app = express()
const port = process.env.PORT || 3000

// swagger definition
const swaggerSpec: swaggerJSdoc.Options = {
    failOnErrors: true,
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Pets API',
            version: '1.0.0',
        },
        servers: [
            {
                url: process.env.BASE_URL || `http://localhost:${port}`,
            }
        ]
    },
    apis: ['./dist/pets/routes/*.js','./dist/users/routes/*.js'],
}

const whitelist = [
    "https://petty-store.vercel.app",
    "https://bear-deciding-wren.ngrok-free.app", 
    "https://v6grnb13-5173.uks1.devtunnels.ms",
    process.env.FRONTEND_URL || 'http://localhost:5173', 
    process.env.FRONTEND_URL_DEV || 'http://localhost:4173'
]

/* Global middlewares */
app.use(cors({
    origin: function (origin: any, callback: (arg0: Error | null, arg1: boolean | undefined) => void) {
      console.log('Request Origin:', origin);
      if (whitelist.indexOf(origin || '') !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Secondary-Authorization'],
    exposedHeaders: ['set-cookie']
}));

app.set('trust proxy', 1);

app.use(cookieParser());
app.use(express.json())

app.use(
    '/api-docs',
    swaggerUI.serve,
    swaggerUI.setup(swaggerJSdoc(swaggerSpec))
);

// Initialize server with database connection
const startServer = async () => {
    try {
        await new MongoDBClient().init();
        console.log('Database connected successfully');

        /* Routes */
        app.use('/donations', paystackRoutes)
        app.use('/pets', petRoutes)
        app.use('/users', userRoutes)

        app.get('*', (req: Request, res: Response) => {
            res.send("<h1>Hello</h1>")
        })

        app.post('/api/upload', async (req: Request, res: Response) => {
            try {
                // Validate content type
                const contentType = req.headers['content-type']
                if (contentType !== 'application/json') {
                    res.status(415).json(
                        { error: 'Content-Type must be application/json' }
                    )
                    return;
                }
        
                // Parse and validate request body
                const body = req.body
                
                if (!body.filename || !body.contentType) {
                    res.status(400).json(
                        { error: 'filename and contentType are required' }
                    )
                    return;
                }
        
                const { filename, contentType: fileType, bucketName } = body
        
                const client = new S3Client({ 
                    region: 'us-east-1',
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ || '',
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
                    }
                })
        
                const { url, fields } = await createPresignedPost(client, {
                    Bucket: bucketName,
                    Key: `${timeFormatter()}/${filename}-${Math.round(Math.random() * 1000)}.${fileType.split('/')[1]}`,
                    Conditions: [
                        ['content-length-range', 0, 10485760], // up to 10 MB
                        ['starts-with', '$Content-Type', fileType],
                    ],
                    Fields: {
                        acl: 'public-read',
                        'Content-Type': fileType,
                    },
                })
        
                res.json({ url, fields })
                return;
            } catch (error) {
                console.error('Upload error:', error)
                
                if (error instanceof SyntaxError) {
                    res.status(400).json(
                        { error: 'Invalid JSON format' }
                    )
                    return;
                }
        
                res.status(500).json(
                    { error: 'Internal server error' }
                )
                return;
            }
        })

        app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
            console.error(err);
            res.status(500).json({ 
                message: 'Internal server error', 
                error: err.message || 'Unknown error' 
            });
        });

        if (process.env.NODE_ENV !== 'test') {
            app.listen(port, () => {
                console.log(`⚡️[server]: Server is running at https://localhost:${port}`)
            });
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app