import mongoose, { Schema, type Document } from "mongoose"

export interface IUserToken extends Document {
    token: string
    refreshToken: string
    tokenType: "access" | "refresh"
    ipAddress: string
    userAgent: string
    userId: mongoose.Schema.Types.ObjectId
    expiresAt: Date
    refreshExpiresAt: Date
    isRevoked: boolean
    createdAt: Date
    updatedAt: Date
}

const UserTokenSchema: Schema = new Schema(
    {
        refreshToken: {
            type: String,
            required: true,
            unique: false,
        },
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isRevoked: {
            type: Boolean,
            default: false,
        },
        createdAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    },
)

// Create an index to automatically remove expired tokens
UserTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export default mongoose.model<IUserToken>("UserToken", UserTokenSchema)
