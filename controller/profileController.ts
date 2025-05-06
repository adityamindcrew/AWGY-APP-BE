import { type Request, type Response } from "express"
import fs from "fs"
import path from "path"
import UserModel from "../models/user"
import { updateClientInfo } from "../utils/helper"


export const addUpdateProfilePicture = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded",
            })
        }

        // Get user
        const user = await UserModel.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            })
        }

        // Update client info
        if (req.clientInfo) {
            updateClientInfo(user, req.clientInfo)
        }

        // Delete old profile picture if exists
        if (user.profilePicture) {
            const oldPicturePath = path.join(__dirname, "uploads", "profile-pictures", user.profilePicture)
            console.log(">>>>>>>>>>>>>>>>>>>>", oldPicturePath)
            if (fs.existsSync(oldPicturePath)) {
                fs.unlinkSync(oldPicturePath)
            }
        }

        // Update profile with new picture path
        const relativePath = `${req.file.filename}`
        user.profilePicture = relativePath
        await user.save()

        return res.status(200).json({
            status: res.statusCode,
            message: "Profile picture uploaded successfully",
            profilePicture: relativePath,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error: any) {
        console.error("Error uploading profile picture:", error)
        return res.status(500).json({
            success: false,
            error: "Failed to upload profile picture",
            details: error.message,
        })
    }
}

export const getProfile = async (req: Request, res: Response) => {
    try {
        // Get user with all fields except password
        const user = await UserModel.findById(req.user?.id).select("-password")
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // // Update client info
        // if (req.clientInfo) {
        //     updateClientInfo(user, req.clientInfo)
        //     await user.save()
        // }

        // Return user data
        return res.status(200).json({
            status: res.statusCode,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                address: user.address,
                street: user.street,
                city: user.city,
                postalCode: user.postalCode,
                profilePicture: user.profilePicture || null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        })
    } catch (error: any) {
        console.error("Error fetching profile:", error)
        return res.status(500).json({
            error: "Failed to fetch profile",
            details: error.message,
        })
    }
}

export const UpdateProfileInfo = async (req: Request, res: Response) => {
    try {
        const { address, street, city, postalCode } = req.body

        // Validate required fields
        if (!address || !street || !city || !postalCode) {
            return res.status(400).json({
                error: "Missing required fields. Address, street, city, and postal code are required.",
            })
        }

        // Get user
        const user = await UserModel.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // Update client info
        if (req.clientInfo) {
            updateClientInfo(user, req.clientInfo)
        }

        // Update user profile data
        user.address = address
        user.street = street
        user.city = city
        user.postalCode = postalCode

        await user.save()

        return res.status(200).json({
            status: res.statusCode,
            message: "Profile updated successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                address: user.address,
                street: user.street,
                city: user.city,
                postalCode: user.postalCode,
                profilePicture: user.profilePicture || null,
            },
        })
    } catch (error: any) {
        console.error("Error updating profile:", error)
        return res.status(500).json({
            error: "Failed to update profile",
            details: error.message,
        })
    }
}
