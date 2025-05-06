import crypto from "crypto"
import type { Request } from "express"
import fs from "fs"
import multer from "multer"
import path from "path"

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "..", "uploads")
const profilePicsDir = path.join(uploadsDir, "profile-pictures")

    // Ensure directories exist
    ;[uploadsDir, profilePicsDir].forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    })

// Configure storage for profile pictures
const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilePicsDir)
    },
    filename: (req, file, cb) => {
        // Generate a unique filename with original extension
        const uniqueSuffix = crypto.randomBytes(16).toString("hex")
        const fileExt = path.extname(file.originalname)
        cb(null, `profile-${uniqueSuffix}${fileExt}`)
    },
})

// File filter to allow only images for profile pictures
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."))
    }
}

// Create multer instances
export const uploadProfilePictureMulter = multer({
    storage: profilePictureStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: imageFileFilter,
}).single("profilePicture")

// Error handler for multer
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                error: "File size exceeds the limit",
            })
        }

        console.log('multer err', err)
        return res.status(400).json({
            success: false,
            error: err.message,
        })
    } else if (err) {
        console.log("errror", err)
        return res.status(400).json({
            success: false,
            error: err.message,
        })
    }
    next()
}
