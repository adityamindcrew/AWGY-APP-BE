import express from "express"
import {
    addToWatchlist,
    getEarningsData,
    getQuotes,
    getWatchlist,
    updateWatchlistItemStatus,
} from "../controller/watchlistController"
import { authenticateJWT } from "../middleware/auths"

const router = express.Router()

// All routes require authentication
router.use(authenticateJWT)

// Add a symbol to the watchlist
router.post("/add", addToWatchlist)

// Get user's watchlist
router.get("/", getWatchlist)

// Update watchlist item status
router.put("/status", updateWatchlistItemStatus)

// Get earnings data for watchlist symbols
router.get("/earnings", getEarningsData)

// Get real-time quotes for watchlist symbols
router.get("/quotes", getQuotes)

export default router
