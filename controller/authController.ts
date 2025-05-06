import bcrypt from "bcryptjs"
import { type Request, type Response } from "express"
import jwt from "jsonwebtoken"
import { authUtils } from "../middleware/auths"
import UserModel from "../models/user"
import { default as UserToken } from "../models/userToken"
import { getTwoMinutesFromNow, updateClientInfo } from "../utils/helper"


export const registerUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password, name, address, street, city, postalCode } = req.body

    if (!email || !password || !name) {
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode, message: "Email, password, and name are required"
        })
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode, message: "Name must be in words (no numbers)"
        })
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode, message: "Invalid email format"
        })
    }

    if (password.length < 6) {
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode, message: "Password must be at least 6 characters long"
        })
    }

    try {
        const existingUser = await UserModel.findOne({ email })

        if (existingUser) {
            return res.status(409).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Email already exists",
            })
        }
        if (!req.clientInfo) {
            return res.status(400).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Client info is required",
            })
        }

        const clientInfo = req.clientInfo

        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = await UserModel.create({
            email,
            password: hashedPassword,
            name,
            tokenVersion: 0,
            address,
            street,
            city,
            postalCode,
            clientInfo: {
                isStaging: clientInfo.isStaging === "true",
                deviceid: clientInfo.deviceid,
                camefrom: clientInfo.camefrom.toLowerCase() === "ios" ? "ios" : "android",
                appversion: clientInfo.appversion,
                lastUpdated: new Date(),
            },
        })
        newUser.tokenVersion = (newUser.tokenVersion || 0) + 1
        await newUser.save()

        // Generate fresh tokens
        const accessToken = await authUtils.generateAccessToken(newUser._id.toString(), newUser.tokenVersion)
        const refreshToken = authUtils.generateToken()
        res.status(200).json({
            status: res.statusCode === 201,
            statusCode: res.statusCode,
            message: "User registered successfully",
            data: {
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                address: newUser.address,
                street: newUser.street,
                city: newUser.city,
                postalCode: newUser.postalCode,
                accessToken,
                refreshToken,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            },
        })
    } catch (error: any) {
        console.error("Error during registration:", error)
        res.status(500).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: error.message,
        })
    }
}

export const loginUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body
    console.log("Login attempt for:", email)

    if (!email || !password) {
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "Email and password are required",

        })
    }

    try {
        // Find user by email
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "User not found",

            })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Invalid password",
            })
        }

        // Get client info from the validated request
        if (!req.clientInfo) {
            console.error("Client info is undefined in login route")
            return res.status(400).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Client info is required",
            })
        }

        // Update user's client info
        updateClientInfo(user, req.clientInfo)
        await user.save()

        // Increment token version to invalidate any existing tokens
        // This is a security measure to ensure old tokens can't be used
        user.tokenVersion = (user.tokenVersion || 0) + 1
        await user.save()

        // Generate fresh tokens
        const accessToken = await authUtils.generateAccessToken(user._id.toString(), user.tokenVersion)
        const refreshToken = authUtils.generateToken()

        // Set expiration dates
        const accessTokenExpiration = getTwoMinutesFromNow() // 2 minutes
        const refreshTokenExpiration = new Date()
        refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 14) // 14 days

        // Store tokens in database
        await UserToken.create({
            token: accessToken,
            refreshToken: refreshToken,
            userId: user._id,
            expiresAt: accessTokenExpiration,
            refreshExpiresAt: refreshTokenExpiration,
        })

        // Return success response with tokens
        return res.status(200).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "Login successful",
            expiresIn: 120,
            data: {
                userId: user._id,
                name: user.name,
                email: user.email,
                address: user.address,
                street: user.street,
                city: user.city,
                postalCode: user.postalCode,
                profilePicture: user.profilePicture || null,
                accessToken,
                refreshToken,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        })
    } catch (error: any) {
        console.error("Error during login:", error)
        return res.status(500).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "An unexpected error occurred during login.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

export const logoutUser = async (req: Request, res: Response) => {
    try {
        const accessToken = req.header("Authorization")?.replace("Bearer ", "") || req.header("x-auth-token")
        const refreshToken = req.body.refreshToken

        // Revoke access token if present
        if (accessToken) {
            await UserToken.updateOne({ token: accessToken, userId: req.user?.id }, { isRevoked: true })
        }

        // Revoke refresh token if present
        if (refreshToken) {
            await UserToken.updateOne({ refreshToken: refreshToken, userId: req.user?.id }, { isRevoked: true })
        }

        // Increment token version to invalidate access tokens
        const user = await UserModel.findById(req.user?.id)
        if (user) {
            // Update client info if available
            if (req.clientInfo) {
                updateClientInfo(user, req.clientInfo)
            }

            user.tokenVersion = (user.tokenVersion || 0) + 1
            await user.save()
        }

        res.status(200).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode, message: "Logged out successfully"
        })
    } catch (error: any) {
        console.error("Error during logout:", error)
        res.status(500).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: error.message,
            error: "Failed to logout",
        })
    }
}

export const UserrefreshToken = async (req: Request, res: Response) => {
    const { accessToken, refreshToken } = req.body
    console.log("Token refresh request received")

    // Validate required parameters
    if (!refreshToken) {
        console.log("Refresh token missing in request")
        return res.status(400).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "Refresh token is required"
        })
    }

    // If access token is provided, check if it's expired before refreshing
    if (accessToken) {
        try {
            jwt.verify(accessToken, process.env.JWT_SECRET || "defaultsecret")

            console.log("Access token is still valid, refresh not needed")
            return res.status(400).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Current access token is still valid",
            })
        } catch (error: any) {
            // Only proceed with refresh if token is expired
            if (error.name !== "TokenExpiredError") {
                console.log("Invalid access token provided:", error.message)
                return res.status(400).json({
                    status: res.statusCode === 200,
                    statusCode: res.statusCode,
                    message: "The provided access token is invalid, not expired",
                    error: error.message
                })
            }
        }
    }

    try {
        // Find the refresh token in the database with detailed query
        const refreshTokenDoc = await UserToken.findOne({
            refreshToken: refreshToken,
            isRevoked: false,
            refreshExpiresAt: { $gt: new Date() },
        })

        // Log the result of the token lookup
        console.log("Refresh token lookup result:", refreshTokenDoc ? "Found" : "Not found")

        if (!refreshTokenDoc) {
            return res.status(401).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "Invalid refresh token.Please login",
            })
        }

        // Get the user and verify they exist
        const user = await UserModel.findById(refreshTokenDoc.userId)

        if (!user) {
            console.log("User not found for token:", refreshTokenDoc.userId)
            // Revoke the token since the user doesn't exist
            await UserToken.updateOne({ _id: refreshTokenDoc._id }, { isRevoked: true })

            return res.status(404).json({
                status: res.statusCode === 200,
                statusCode: res.statusCode,
                message: "User not found",
            })
        }

        // Update client info if available
        if (req.clientInfo) {
            console.log("Updating client info for user:", user._id)
            updateClientInfo(user, req.clientInfo)
            await user.save()
        }

        // Generate new access token with timestamp to ensure uniqueness
        const timestamp = Date.now()
        const newAccessToken = await authUtils.generateAccessToken(user._id.toString(), user.tokenVersion)
        console.log("Generated new access token for user:", user._id)

        // Calculate access token expiration (2 minutes from now)
        const accessTokenExpiration = getTwoMinutesFromNow()

        // Generate new refresh token
        const newRefreshToken = authUtils.generateToken()
        const refreshTokenExpiration = new Date()
        refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 14) // 14 days

        // Store new tokens in database
        const newTokenDoc = await UserToken.create({
            token: newAccessToken,
            refreshToken: newRefreshToken,
            userId: user._id,
            expiresAt: accessTokenExpiration,
            refreshExpiresAt: refreshTokenExpiration,
        })
        console.log("Stored new tokens in database with ID:", newTokenDoc._id)

        // Invalidate old refresh token
        await UserToken.updateOne({ _id: refreshTokenDoc._id }, { isRevoked: true })
        console.log("Invalidated old refresh token:", refreshTokenDoc._id)

        // Return success response with new tokens
        return res.status(200).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "Token refreshed successfully",
            data: {
                userId: user._id,
                name: user.name,
                email: user.email,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        })
    } catch (error: any) {
        console.error("Error refreshing token:", error)
        return res.status(500).json({
            status: res.statusCode === 200,
            statusCode: res.statusCode,
            message: "Failed to refresh token",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}