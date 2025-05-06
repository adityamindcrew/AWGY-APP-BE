import mongoose, { Schema, type Document } from "mongoose"

export interface IDriverProfile extends Document {
    userId: mongoose.Schema.Types.ObjectId
    profilePicture: string
    licenseNumber: string
    licenseType: string
    licenseExpiry: Date
    experience: number // in years
    vehicleTypes: string[]
    specializations: string[]
    availability: {
        isAvailable: boolean
        availableFrom: Date
        availableTo: Date
    }
    rating: number
    completedTrips: number
    bio: string
    contactNumber: string
    emergencyContact: {
        name: string
        relationship: string
        phoneNumber: string
    }
    documents: {
        documentType: string
        documentUrl: string
        isVerified: boolean
        uploadedAt: Date
    }[]
    createdAt: Date
    updatedAt: Date
}

const DriverProfileSchema: Schema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        profilePicture: {
            type: String,
            default: "",
        },
        licenseNumber: {
            type: String,
            required: true,
            unique: true,
        },
        licenseType: {
            type: String,
            required: true,
        },
        licenseExpiry: {
            type: Date,
            required: true,
        },
        experience: {
            type: Number,
            default: 0,
        },
        vehicleTypes: {
            type: [String],
            default: [],
        },
        specializations: {
            type: [String],
            default: [],
        },
        availability: {
            isAvailable: {
                type: Boolean,
                default: false,
            },
            availableFrom: {
                type: Date,
                default: null,
            },
            availableTo: {
                type: Date,
                default: null,
            },
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        completedTrips: {
            type: Number,
            default: 0,
        },
        bio: {
            type: String,
            default: "",
        },
        contactNumber: {
            type: String,
            required: true,
        },
        emergencyContact: {
            name: {
                type: String,
                required: true,
            },
            relationship: {
                type: String,
                required: true,
            },
            phoneNumber: {
                type: String,
                required: true,
            },
        },
        documents: [
            {
                documentType: {
                    type: String,
                    required: true,
                },
                documentUrl: {
                    type: String,
                    required: true,
                },
                isVerified: {
                    type: Boolean,
                    default: false,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    },
)

export default mongoose.model<IDriverProfile>("DriverProfile", DriverProfileSchema)
