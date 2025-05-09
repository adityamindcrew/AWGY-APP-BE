import mongoose, { Schema, type Document } from "mongoose"

export interface IPlaidItem extends Document {
    userId: mongoose.Schema.Types.ObjectId
    accessToken: string
    itemId: string
    institutionId: string
    institutionName: string
    createdAt: Date
    updatedAt: Date
}

const PlaidItemSchema: Schema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        accessToken: {
            type: String,
            required: true,
        },
        itemId: {
            type: String,
            required: true,
        },
        institutionId: {
            type: String,
            required: true,
        },
        institutionName: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
)

export default mongoose.model<IPlaidItem>("PlaidItem", PlaidItemSchema)
