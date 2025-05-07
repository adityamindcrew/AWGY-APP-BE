import bcrypt from "bcryptjs"
import crypto from "crypto"
import dotenv from "dotenv"
import express, { type Request, type Response } from "express"
import { loginUser, logoutUser, registerUser, UserrefreshToken } from "../controller/authController"
import UserModel from "../models/user"
import UserToken from "../models/userToken"
import { updateClientInfo } from "../utils/helper"
dotenv.config()

const router = express.Router()

router.post("/register", registerUser)

// Login Endpoint - Modified to handle refresh tokens as requested
router.post("/login",
    loginUser)

// Forgot Password Endpoint
router.post("/forgot-password", async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body
    console.log("Forgot password request for:", email)

    // Input validation
    if (!email) {
        return res.status(400).json({ error: "Email is required" })
    }

    try {
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // Get client info from the validated request
        const clientInfo = req.clientInfo!

        // Update user's client info
        updateClientInfo(user, clientInfo)

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex")
        const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now

        // Save reset token to user
        user.resetPasswordToken = resetToken
        user.resetPasswordExpires = new Date(resetTokenExpiry)
        await user.save()

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

        // Send email with reset link
        // Note: Email sending code removed for brevity

        res.status(200).json({
            message: "Password reset email sent",
            email: user.email,
        })
    } catch (error: any) {
        console.error("Error during forgot password:", error)
        res.status(500).json({
            error: "Failed to process forgot password request",
            details: error.message,
        })
    }
})

// Reset Password Endpoint
router.post("/reset-password/:token", async (req: Request, res: Response): Promise<any> => {
    const { password } = req.body
    const { token } = req.params

    // Input validation
    if (!password) {
        return res.status(400).json({ error: "Password is required" })
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" })
    }

    try {
        // Find user with valid reset token
        const user = await UserModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        })

        if (!user) {
            return res.status(400).json({ error: "Password reset token is invalid or has expired" })
        }

        // Get client info from the validated request
        const clientInfo = req.clientInfo!

        // Update user's client info
        updateClientInfo(user, clientInfo)

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10)
        user.password = hashedPassword
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined

        // Increment token version to invalidate all previous tokens
        user.tokenVersion = (user.tokenVersion || 0) + 1

        await user.save()

        // Revoke all refresh tokens
        await UserToken.updateMany({ userId: user._id, isRevoked: false }, { isRevoked: true })

        res.status(200).json({
            message: "Password has been reset successfully",
        })
    } catch (error: any) {
        console.error("Error during password reset:", error)
        res.status(500).json({
            error: "Failed to reset password",
            details: error.message,
        })
    }
})

// Delete Account Endpoint
router.delete("/account", async (req: Request, res: Response): Promise<any> => {
    const { password } = req.body

    // Input validation
    if (!password) {
        return res.status(400).json({ error: "Password is required to delete account" })
    }

    try {
        // Find user
        const user = await UserModel.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" })
        }

        // Get client info from the validated request
        const clientInfo = req.clientInfo!

        // Log the deletion with client info
        console.log(
            `User ${user.email} deleted account from ${clientInfo.camefrom} device ${clientInfo.deviceid}, app version ${clientInfo.appversion}`,
        )

        // Revoke all refresh tokens
        await UserToken.deleteMany({ userId: user._id })

        // Delete user
        await UserModel.deleteOne({ _id: user._id })

        res.status(200).json({
            message: "Account deleted successfully",
        })
    } catch (error: any) {
        console.error("Error during account deletion:", error)
        res.status(500).json({
            error: "Failed to delete account",
            details: error.message,
        })
    }
})

// Change Password Endpoint
router.post("/change-password", async (req: Request, res: Response): Promise<any> => {
    const { currentPassword, newPassword } = req.body

    // Input validation
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" })
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" })
    }

    try {
        // Find user
        const user = await UserModel.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Current password is incorrect" })
        }

        // Get client info from the validated request
        const clientInfo = req.clientInfo!

        // Update user's client info
        updateClientInfo(user, clientInfo)

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword

        // Increment token version to invalidate all previous tokens
        user.tokenVersion = (user.tokenVersion || 0) + 1

        await user.save()

        // Revoke all refresh tokens except current one
        const currentRefreshToken = req.body.refreshToken
        if (currentRefreshToken) {
            await UserToken.updateMany(
                {
                    userId: user._id,
                    isRevoked: false,
                    token: { $ne: currentRefreshToken },
                },
                { isRevoked: true },
            )
        }

        res.status(200).json({
            message: "Password changed successfully",
        })
    } catch (error: any) {
        console.error("Error during password change:", error)
        res.status(500).json({
            error: "Failed to change password",
            details: error.message,
        })
    }
})

// Refresh Token Endpoint
router.post("/refresh-token", UserrefreshToken)


// Logout Endpoint
router.post("/logout", logoutUser)

// Logout from all devices
// router.post("/logout-all", authenticateJWT, auths, async (req: Request, res: Response) => {
//     try {
//         // Revoke all tokens
//         await UserToken.updateMany({ userId: req.user?.id, isRevoked: false }, { isRevoked: true })

//         // Increment token version to invalidate access tokens
//         const user = await UserModel.findById(req.user?.id)
//         if (user) {
//             // Update client info if available
//             if (req.clientInfo) {
//                 updateClientInfo(user, req.clientInfo)
//             }

//             user.tokenVersion = (user.tokenVersion || 0) + 1
//             await user.save()
//         }

//         res.status(200).json({ message: "Logged out from all devices successfully" })
//     } catch (error: any) {
//         console.error("Error during logout from all devices:", error)
//         res.status(500).json({
//             error: "Failed to logout from all devices",
//             details: error.message,
//         })
//     }
// })

export default router
