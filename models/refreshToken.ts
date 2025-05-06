import mongoose, { Schema, type Document } from "mongoose"

export interface IRefreshToken extends Document {
    token: string
    userId: mongoose.Schema.Types.ObjectId
    expiresAt: Date
    isRevoked: boolean
    createdAt: Date
    updatedAt: Date
}

const RefreshTokenSchema: Schema = new Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
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
    },
    {
        timestamps: true,
    },
)

// Create an index to automatically remove expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema)
export default RefreshToken
