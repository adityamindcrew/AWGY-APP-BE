import bcrypt from "bcryptjs"
import type { Request, Response } from "express"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../middleware/auths"
import UserModel from "../models/user"
import { default as UserToken } from "../models/userToken"
import { updateClientInfo } from "../utils/helper"
import { validateLogin, validateRegistration } from "../utils/validation"

export const registerUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password, name, address, street, city, postalCode } = req.body

    // Validate registration data
    const validationError = validateRegistration({
        email,
        password,
        name,
        address,
        street,
        city,
        postalCode,
    })

    if (validationError) {
        return res.status(400).json({
            status: false,
            statusCode: 400,
            message: validationError,
            data: null,
        })
    }

    try {
        const existingUser = await UserModel.findOne({ email })

        if (existingUser) {
            return res.status(409).json({
                status: false,
                statusCode: 409,
                message: "Email already exists",
                data: null,
            })
        }

        if (!req.clientInfo) {
            return res.status(400).json({
                status: false,
                statusCode: 400,
                message: "Client info is required",
                data: null,
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
        const accessToken = await generateAccessToken({ id: newUser._id })
        const refreshToken = await generateRefreshToken({ id: newUser._id })

        await UserToken.create({
            userId: newUser._id,
            refreshToken: refreshToken,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })

        res.status(200).json({
            status: true,
            statusCode: 200,
            message: "User registered successfully",
            data: {
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                address: newUser.address,
                street: newUser.street,
                city: newUser.city,
                postalCode: newUser.postalCode,
                profilePicture: newUser.profilePicture,
                accessToken,
                refreshToken,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            },
        })
    } catch (error: any) {
        console.error("Error during registration:", error)
        res.status(500).json({
            status: false,
            statusCode: 500,
            message: error.message,
            data: null,
        })
    }
}

export const loginUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body
    console.log("Login attempt for:", email)

    // Validate login data
    const validationError = validateLogin({ email, password })

    if (validationError) {
        return res.status(400).json({
            status: false,
            statusCode: 400,
            message: validationError,
            data: null,
        })
    }

    try {
        // Find user by email
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({
                status: false,
                statusCode: 404,
                message: "User not found",
                data: null,
            })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                status: false,
                statusCode: 401,
                message: "Invalid password",
                data: null,
            })
        }

        // Get client info from the validated request
        if (!req.clientInfo) {
            console.error("Client info is undefined in login route")
            return res.status(400).json({
                status: false,
                statusCode: 400,
                message: "Client info is required",
                data: null,
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
        const accessToken = await generateAccessToken({ id: user._id })
        const refreshToken = await generateRefreshToken({ id: user._id })

        await UserToken.create({
            userId: user._id,
            refreshToken: refreshToken,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })

        // Return success response with tokens
        return res.status(200).json({
            status: true,
            statusCode: 200,
            message: "Login successful",
            data: {
                userId: user._id,
                name: user.name,
                email: user.email,
                address: user.address,
                street: user.street,
                city: user.city,
                postalCode: user.postalCode,
                profilePicture: user.profilePicture || "person_image.png",
                accessToken,
                refreshToken,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        })
    } catch (error: any) {
        console.error("Error during login:", error)
        return res.status(500).json({
            status: false,
            statusCode: 500,
            message: "An unexpected error occurred during login.",
            data: null,
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
            status: true,
            statusCode: 200,
            message: "Logged out successfully",
            data: null,
        })
    } catch (error: any) {
        console.error("Error during logout:", error)
        res.status(500).json({
            status: false,
            statusCode: 500,
            message: "Error during logout",
            data: null,
        })
    }
}

export const UserrefreshToken = async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken
    if (!refreshToken)
        return res.status(401).json({
            status: false,
            statusCode: 401,
            message: "Refresh token required",
            data: null,
        })

    try {
        const userData = await verifyRefreshToken(refreshToken)
        const newAccessToken = await generateAccessToken({ id: userData.id })
        console.log("first newAccessToken", newAccessToken)
        return res.json({
            status: true,
            statusCode: 200,
            message: "Refresh token successfully",
            data: {
                accessToken: newAccessToken,
            },
        })
    } catch (err: any) {
        return res.status(403).json({
            status: false,
            statusCode: 403,
            message: "Invalid refresh token",
            data: null,
        })
    }
}