import dotenv from "dotenv"
import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import UserModel from "../models/user"

dotenv.config()

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: { id: string }
            payload: { id: string }
        }
    }
}


export async function generateAccessToken(user: object): Promise<string> {
    return jwt.sign({ user }, process.env.JWT_SECRET || "", { expiresIn: '24h' });
}

// Refresh token expires in 7 days
export async function generateRefreshToken(user: object): Promise<string> {
    return jwt.sign({ user }, process.env.JWT_SECRET || "", { expiresIn: '7d' });
}


export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({
        status: false,
        statusCode: res.statusCode,
        message: 'Access token required',
        data: null
    });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
            user: { id: string; tokenVersion?: number }
        }

        console.log('decodeddecoded', decoded)

        if (decoded.user.tokenVersion !== undefined) {
            const user = await UserModel.findById(decoded.user.id)

            if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
                console.log("Token version mismatch")
                return res.status(401).json({ error: "Invalid token version" })
            }
        }
        req.user = { id: decoded.user.id }
        console.log("Valid JWT token, user authenticated:", req.user.id)
        return next()
    } catch (err) {
        return res.status(401).json({
            status: false,
            statusCode: res.statusCode,
            message: 'Access token invalid or expired',
            data: null
        });
    }
}

export async function verifyRefreshToken(token: string) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
            user: { id: string; tokenVersion?: number }
        }
        return { id: decoded.user.id }
    } catch (err) {
        throw err;
    }
}