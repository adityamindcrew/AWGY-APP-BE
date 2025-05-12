import type { Request, Response } from "express"
import finnhubClient from "../config/finnhub"
import Watchlist from "../models/watchlist"
import { sendNotFound, sendServerError, sendSuccess, sendValidationError } from "../utils/response-handler"

// Add a symbol to the watchlist
export const addToWatchlist = async (req: Request, res: Response): Promise<any> => {
    try {
        const { symbol } = req.body
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        if (!symbol) {
            return sendValidationError(res, "Symbol is required")
        }

        // Verify symbol exists with FinnHub
        try {
            const symbolData = await finnhubClient.symbolSearch(symbol)
            console.log('first symbolData symbolData', symbolData)
            if (!symbolData.result || symbolData.result.length === 0) {
                return sendValidationError(res, "Invalid symbol. Please enter a valid stock symbol.")
            }

            // Add to watchlist
            const watchlist = await Watchlist.findOneAndUpdate(
                { userId },
                {
                    $addToSet: {
                        symbols: {
                            symbol: symbol.toUpperCase(),
                            status: "pending",
                            addedAt: new Date(),
                        },
                    },
                },
                { upsert: true, new: true },
            )

            return sendSuccess(res, "Symbol added to watchlist", { watchlist })
        } catch (error: any) {
            console.error("Error verifying symbol:", error)
            return sendValidationError(res, "Error verifying symbol. Please try again.")
        }
    } catch (error: any) {
        console.error("Error adding to watchlist:", error)
        return sendServerError(res, error)
    }
}

// Get user's watchlist
export const getWatchlist = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        const watchlist = await Watchlist.findOne({ userId })

        if (!watchlist) {
            return sendSuccess(res, "No watchlist found", { symbols: [] })
        }

        return sendSuccess(res, "Watchlist retrieved successfully", { watchlist })
    } catch (error: any) {
        console.error("Error fetching watchlist:", error)
        return sendServerError(res, error)
    }
}

// Update watchlist item status
export const updateWatchlistItemStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const { symbolId, status } = req.body
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        if (!symbolId || !status) {
            return sendValidationError(res, "Symbol ID and status are required")
        }

        if (!["accepted", "rejected"].includes(status)) {
            return sendValidationError(res, "Invalid status. Status must be 'accepted' or 'rejected'")
        }

        const watchlist = await Watchlist.findOneAndUpdate(
            {
                userId,
                "symbols._id": symbolId,
            },
            {
                $set: { "symbols.$.status": status },
            },
            { new: true },
        )

        if (!watchlist) {
            return sendNotFound(res, "Watchlist item not found")
        }

        return sendSuccess(res, "Watchlist item status updated", { watchlist })
    } catch (error: any) {
        console.error("Error updating watchlist item:", error)
        return sendServerError(res, error)
    }
}

// Get earnings data for watchlist symbols
export const getEarningsData = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        // Get user's accepted watchlist symbols
        const watchlist = await Watchlist.findOne({ userId })

        if (!watchlist || !watchlist.symbols || watchlist.symbols.length === 0) {
            return sendSuccess(res, "No symbols in watchlist", { earnings: [] })
        }

        const acceptedSymbols = watchlist.symbols.filter((item) => item.status === "accepted").map((item) => item.symbol)

        if (acceptedSymbols.length === 0) {
            return sendSuccess(res, "No accepted symbols in watchlist", { earnings: [] })
        }

        // Fetch earnings data for each symbol
        const earningsPromises = acceptedSymbols.map(async (symbol) => {
            try {
                const data = await finnhubClient.companyEarnings(symbol)
                return { symbol, earnings: data }
            } catch (error) {
                return { symbol, error: "Failed to fetch earnings" }
            }
        })

        const earningsData = await Promise.all(earningsPromises)

        return sendSuccess(res, "Earnings data retrieved successfully", { earnings: earningsData })
    } catch (error: any) {
        console.error("Error fetching earnings:", error)
        return sendServerError(res, error)
    }
}

// Get real-time quotes for watchlist symbols
export const getQuotes = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        // Get user's accepted watchlist symbols
        const watchlist = await Watchlist.findOne({ userId })

        if (!watchlist || !watchlist.symbols || watchlist.symbols.length === 0) {
            return sendSuccess(res, "No symbols in watchlist", { quotes: [] })
        }

        const acceptedSymbols = watchlist.symbols.filter((item) => item.status === "accepted").map((item) => item.symbol)

        if (acceptedSymbols.length === 0) {
            return sendSuccess(res, "No accepted symbols in watchlist", { quotes: [] })
        }

        // Fetch quotes for each symbol
        const quotePromises = acceptedSymbols.map(async (symbol) => {
            try {
                const data = await finnhubClient.quote(symbol)
                return {
                    symbol,
                    quote: {
                        currentPrice: data.c,
                        change: data.d,
                        percentChange: data.dp,
                        highPrice: data.h,
                        lowPrice: data.l,
                        openPrice: data.o,
                        previousClosePrice: data.pc,
                        timestamp: new Date(data.t * 1000),
                    },
                }
            } catch (error) {
                return { symbol, error: "Failed to fetch quote" }
            }
        })

        const quotesData = await Promise.all(quotePromises)

        return sendSuccess(res, "Quotes retrieved successfully", { quotes: quotesData })
    } catch (error: any) {
        console.error("Error fetching quotes:", error)
        return sendServerError(res, error)
    }
}

// Helper function for unauthorized responses
const sendUnauthorized = (res: Response, message = "Unauthorized access"): Response => {
    return res.status(401).json({
        status: false,
        statusCode: 401,
        message,
    })
}
