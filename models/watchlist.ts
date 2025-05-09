import mongoose, { Schema, type Document } from "mongoose"

export interface IWatchlistItem {
    symbol: string
    addedAt: Date
    status: "pending" | "accepted" | "rejected"
}

export interface IWatchlist extends Document {
    userId: mongoose.Schema.Types.ObjectId
    symbols: IWatchlistItem[]
    createdAt: Date
    updatedAt: Date
}

const WatchlistSchema: Schema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        symbols: [
            {
                symbol: {
                    type: String,
                    required: true,
                },
                addedAt: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ["pending", "accepted", "rejected"],
                    default: "pending",
                },
            },
        ],
    },
    {
        timestamps: true,
    },
)

export default mongoose.model<IWatchlist>("Watchlist", WatchlistSchema)
