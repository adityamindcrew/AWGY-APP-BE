import crypto from "crypto"
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
        }
    }
}

// Helper function to generate token
const generateToken = (): string => {
    return crypto.randomBytes(40).toString("hex")
}

// Helper function to generate access token
const generateAccessToken = (userId: string, tokenVersion: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const payload = {
            user: {
                userId: userId,
                tokenVersion: tokenVersion,
                // Add a timestamp to ensure uniqueness
                timestamp: Date.now(),
            },
        }

        jwt.sign(payload, process.env.JWT_SECRET || "defaultsecret", { expiresIn: "24h" }, (err, token) => {
            if (err) reject(err)
            else resolve(token as string)
        })
    })
}

// Modify the authenticateJWT function to check for token expiration without auto-refresh
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("Authenticating with JWT")

        // Get access token from Authorization header with Bearer prefix
        const accessToken = req.header("Authorization")?.replace("Bearer ", "")

        if (!accessToken) {
            console.log("No access token found")
            return res.status(401).json({ error: "Authentication required" })
        }

        try {
            // Verify the token
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "defaultsecret") as {
                user: { id: string; tokenVersion?: number }
            }

            // Check token version if needed
            if (decoded.user.tokenVersion !== undefined) {
                const user = await UserModel.findById(decoded.user.id)

                if (!user || user.tokenVersion !== decoded.user.tokenVersion) {
                    console.log("Token version mismatch")
                    return res.status(401).json({ error: "Invalid token version" })
                }
            }

            // Token is valid, set user in request
            req.user = { id: decoded.user.id }
            console.log("Valid JWT token, user authenticated:", req.user.id)
            return next()
        } catch (jwtError: any) {
            // Check specifically for token expiration
            if (jwtError.name === "TokenExpiredError") {
                console.log("JWT token expired")
                // Return a specific error for expired tokens so frontend can handle refresh
                return res.status(401).json({
                    error: "Token expired",
                    code: "TOKEN_EXPIRED",
                    message: "Access token has expired. Please refresh your token.",
                })
            }

            // For other JWT errors, return authentication error
            console.log("JWT verification failed:", jwtError.message)
            return res.status(401).json({ error: "Invalid token" })
        }
    } catch (error) {
        console.error("Error in authenticateJWT middleware:", error)
        return res.status(401).json({ error: "Authentication failed" })
    }
}

// Simple middleware for routes that must be authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" })
    }
    next()
}

// Export utility functions for use in other files
export const authUtils = {
    generateToken,
    generateAccessToken,
}

const auth = (req: Request, res: Response, next: NextFunction) => {
    // Get token from Authorization header with Bearer prefix
    const token = req.header("Authorization")?.replace("Bearer ", "")

    // Check if no token
    if (!token) {
        return res.status(401).json({ error: "No token, authorization denied" })
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultsecret") as { user: { id: string } }

        // Add user from payload
        req.user = decoded.user
        next()
    } catch (err) {
        res.status(401).json({ error: "Token is not valid" })
    }
}

export default auth
