import mongoose, { Schema, type Document } from "mongoose"

export interface IUserToken extends Document {
    token: string
    refreshToken: string
    tokenType: "access" | "refresh"
    userId: mongoose.Schema.Types.ObjectId
    expiresAt: Date
    refreshExpiresAt: Date
    isRevoked: boolean
    createdAt: Date
    updatedAt: Date
}

const UserTokenSchema: Schema = new Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
        },
        refreshToken: {
            type: String,
            required: true,
            unique: false,
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
        refreshExpiresAt: {
            type: Date,
            required: true,
        },
        isRevoked: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
)

// Create an index to automatically remove expired tokens
UserTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 })
export default mongoose.model<IUserToken>("UserToken", UserTokenSchema)
