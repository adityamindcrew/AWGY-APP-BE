import mongoose, { type Document, Schema } from "mongoose"

// Define the User interface extending Mongoose's Document
type camefromType = "ios" | "android" | "web"

export interface IUser extends Document {
    email: string
    password: string
    name: string
    tokenVersion: number
    address: string
    street: string
    city: string
    postalCode: string
    profilePicture?: string
    clientInfo: {
        isStaging: string
        deviceid: string
        camefrom: camefromType
        appversion: string
        lastUpdated: Date
    }
    resetPasswordToken?: string
    resetPasswordExpires?: Date
    createdAt: Date
    updatedAt: Date
}

// Create the User schema
const userSchema: Schema<IUser> = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/\S+@\S+\.\S+/, "Please provide a valid email address"],
        },
        password: {
            type: String,
            required: true,
            minlength: [6, "Password must be at least 6 characters long"],
        },
        name: {
            type: String,
            required: true,
            match: [/^[a-zA-Z\s]+$/, "Name must only contain letters and spaces"],
            maxlength: [25, "name cannot exceed 25 characters"],
        },
        tokenVersion: {
            type: Number,
            default: 0,
        },
        address: {
            type: String,
            required: true,
            maxlength: [50, "Address cannot exceed 50 characters"],
        },
        street: {
            type: String,
            required: true,
            match: [/^[a-zA-Z\s]+$/, "Name must only contain letters and spaces"],
            maxlength: [50, "Street cannot exceed 50 characters"],
        },

        city: {
            type: String,
            required: true,
            match: [/^[a-zA-Z\s]+$/, "Name must only contain letters and spaces"],
            maxlength: [50, "Street cannot exceed 50 characters"],

        },
        postalCode: {
            type: String,
            required: true,
            match: [/^\d{6}$/, "Postal code must be exactly 6 digits"],
        },
        profilePicture: {
            type: String,
            default: 'person_image.png',
        },
        clientInfo: {
            isStaging: Boolean,
            deviceid: String,
            camefrom: {
                type: String,
                enum: ["ios", "android", "web"],
                required: true,
            },
            appversion: String,
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
    },
    {
        timestamps: true, // Mongoose will automatically create 'createdAt' and 'updatedAt' fields
    },
)

// Create the User model
const UserModel = mongoose.model<IUser>("User", userSchema)

export default UserModel
