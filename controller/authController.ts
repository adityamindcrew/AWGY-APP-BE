import bcrypt from "bcryptjs"
import { type Request, type Response } from "express"
import jwt from "jsonwebtoken"
import { authUtils } from "../middleware/auths"
import UserModel from "../models/user"
import { default as UserToken } from "../models/userToken"
import { getTwoMinutesFromNow, updateClientInfo } from "../utils/helper"


export const registerUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password, name, address, street, city, postalCode } = req.body
    console.log("Registration request received:", { email, name })

    // Input validation
    if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" })
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
        return res.status(400).json({ error: "Name must be in words (no numbers)" })
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" })
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" })
    }

    try {
        // Check if user already exists
        const existingUser = await UserModel.findOne({ email })

        if (existingUser) {
            return res.status(409).json({ error: "Email already exists" })
        }

        // Get client info from the validated request
        if (!req.clientInfo) {
            return res.status(400).json({ error: "Client info is required" })
        }

        const clientInfo = req.clientInfo

        // Hash password and create user
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
                lang: Number.parseInt(clientInfo.lang),
                camefrom: clientInfo.camefrom.toLowerCase() === "ios" ? "ios" : "android",
                appversion: clientInfo.appversion,
                lastUpdated: new Date(),
            },
        })

        res.status(201).json({
            status: res.statusCode,
            message: "User registered successfully",
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            },
        })
    } catch (error: any) {
        console.error("Error during registration:", error)
        res.status(500).json({
            error: "Failed to register user",
            details: error.message,
        })
    }
}

export const loginUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body
    console.log("Login attempt for:", email)

    if (!email || !password) {
        return res.status(400).json({
            status: 400,
            error: "Email and password are required"
        })
    }

    try {
        // Find user by email
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({
                status: 404,
                error: "User not found"
            })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 401,
                error: "Invalid password"
            })
        }

        // Get client info from the validated request
        if (!req.clientInfo) {
            console.error("Client info is undefined in login route")
            return res.status(400).json({
                status: 400,
                error: "Client info is required"
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
            status: 200,
            message: "Login successful",
            accessToken,
            refreshToken,
            expiresIn: 120, // 2 minutes in seconds
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error: any) {
        console.error("Error during login:", error)
        return res.status(500).json({
            status: 500,
            error: "Failed to login",
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

        res.status(200).json({ message: "Logged out successfully" })
    } catch (error: any) {
        console.error("Error during logout:", error)
        res.status(500).json({
            error: "Failed to logout",
            details: error.message,
        })
    }
}

// export const UserrefreshToken = async (req: Request, res: Response) => {
//     const { accessToken, refreshToken } = req.body

//     if (!refreshToken) {
//         return res.status(400).json({ error: "Refresh token is required" })
//     }

//     // If access token is provided, check if it's expired before refreshing
//     if (accessToken) {
//         try {
//             // Try to verify the token
//             jwt.verify(accessToken, process.env.JWT_SECRET || "defaultsecret")

//             // If verification succeeds, token is still valid
//             return res.status(400).json({
//                 error: "Current access token is still valid",
//                 message: "Only expired tokens can be refreshed",
//             })
//         } catch (error: any) {
//             // Only proceed with refresh if token is expired
//             if (error.name !== "TokenExpiredError") {
//                 return res.status(400).json({
//                     error: "Invalid access token",
//                     message: "The provided access token is invalid, not expired",
//                 })
//             }
//             // If token is expired, continue with refresh process
//         }
//     }

//     try {
//         // Find the refresh token in the database
//         const refreshTokenDoc = await UserToken.findOne({
//             refreshToken: refreshToken,
//             isRevoked: false,
//             refreshExpiresAt: { $gt: new Date() },
//         })

//         if (!refreshTokenDoc) {
//             return res.status(401).json({
//                 error: "Invalid refresh token",
//                 message: "The provided refresh token is invalid or expired. Please login again to get new tokens.",
//             })
//         }

//         // Get the user
//         const user = await UserModel.findById(refreshTokenDoc.userId)

//         if (!user) {
//             return res.status(404).json({ error: "User not found" })
//         }

//         // Update client info if available
//         if (req.clientInfo) {
//             updateClientInfo(user, req.clientInfo)
//             await user.save()
//         }

//         // Generate new access token
//         const newAccessToken = await authUtils.generateAccessToken(user._id.toString(), user.tokenVersion)

//         // Calculate access token expiration (1 hour from now)
//         const accessTokenExpiration = new Date()
//         accessTokenExpiration.setMinutes(accessTokenExpiration.getMinutes() + 2)

//         // Generate new refresh token
//         const newRefreshToken = authUtils.generateToken()
//         const refreshTokenExpiration = new Date()
//         refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 14)

//         // Store new tokens in database
//         await UserToken.create({
//             token: newAccessToken,
//             refreshToken: newRefreshToken,
//             userId: user._id,
//             expiresAt: getTwoMinutesFromNow(),
//             refreshExpiresAt: refreshTokenExpiration,
//         })

//         // Invalidate old refresh token
//         await UserToken.updateOne({ _id: refreshTokenDoc._id }, { isRevoked: true })

//         res.status(200).json({
//             status: res.statusCode,
//             accessToken: newAccessToken,
//             refreshToken: newRefreshToken,
//             data: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//             },
//         })
//     } catch (error: any) {
//         console.error("Error refreshing token:", error)
//         res.status(500).json({
//             error: "Failed to refresh token",
//             details: error.message,
//         })
//     }
// }

export const UserrefreshToken = async (req: Request, res: Response) => {
    const { accessToken, refreshToken } = req.body
    console.log("Token refresh request received")

    // Validate required parameters
    if (!refreshToken) {
        console.log("Refresh token missing in request")
        return res.status(400).json({
            status: 400,
            error: "Refresh token is required"
        })
    }

    // If access token is provided, check if it's expired before refreshing
    if (accessToken) {
        try {
            // Try to verify the token
            jwt.verify(accessToken, process.env.JWT_SECRET || "defaultsecret")

            // If verification succeeds, token is still valid
            console.log("Access token is still valid, refresh not needed")
            return res.status(400).json({
                status: 400,
                error: "Current access token is still valid",
                message: "Only expired tokens can be refreshed",
            })
        } catch (error: any) {
            // Only proceed with refresh if token is expired
            if (error.name !== "TokenExpiredError") {
                console.log("Invalid access token provided:", error.message)
                return res.status(400).json({
                    status: 400,
                    error: "Invalid access token",
                    message: "The provided access token is invalid, not expired",
                })
            }
            console.log("Access token is expired, proceeding with refresh")
            // If token is expired, continue with refresh process
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
                status: 401,
                error: "Invalid refresh token",
                message: "The provided refresh token is invalid or expired. Please login again to get new tokens.",
            })
        }

        // Get the user and verify they exist
        const user = await UserModel.findById(refreshTokenDoc.userId)

        if (!user) {
            console.log("User not found for token:", refreshTokenDoc.userId)
            // Revoke the token since the user doesn't exist
            await UserToken.updateOne({ _id: refreshTokenDoc._id }, { isRevoked: true })

            return res.status(404).json({
                status: 404,
                error: "User not found",
                message: "The user associated with this token no longer exists."
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
            status: 200,
            message: "Token refreshed successfully",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 120, // 2 minutes in seconds
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error: any) {
        console.error("Error refreshing token:", error)
        return res.status(500).json({
            status: 500,
            error: "Failed to refresh token",
            message: "An unexpected error occurred while refreshing your token.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}