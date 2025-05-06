import mongoose, { Schema, type Document } from "mongoose"

export interface IInvalidToken extends Document {
    token: string
    userId: mongoose.Schema.Types.ObjectId
    expiresAt: Date
    createdAt: Date
}

const InvalidTokenSchema: Schema = new Schema(
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
    },
    {
        timestamps: true,
    },
)


export default mongoose.model<IInvalidToken>("InvalidToken", InvalidTokenSchema)
