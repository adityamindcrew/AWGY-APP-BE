import dotenv from "dotenv"
import express from "express"
import mongoose from "mongoose"
import path from "path"
import { authenticateJWT } from "./middleware/auths"
import { validateRequestParams } from "./middleware/requestValidator"
import authRouter from "./routes/auth"
import { getApiPlaidRouter, plaidRouter } from "./routes/plaid"
import { getApiRouter, router } from "./routes/profile"
// import getApiRouter from "./routes/getApiRouter"
import watchlistRouter from "./routes/watchlist"

// Load environment variables
dotenv.config()

const app = express()
const port = process.env.PORT
const mongoURI = process.env.MONGO_URI || ""
app.use(express.json())
// Removed cookie parser as it's not needed for mobile devices
// app.use(
//     cors({
//         origin: process.env.FRONTEND_URL || "http://localhost:3000",
//         credentials: true, // Still allow credentials for potential future use
//     }),
// )

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Debug middleware to log all requests
app.use((req, res, next) => {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    // console.log("Headers:", JSON.stringify(req.headers, null, 2))
    next()
})


// Define routes

// Apply validateRequestParams middleware before routes
app.use("/api/profile", authenticateJWT, getApiRouter)
app.use("/api/plaid", authenticateJWT, getApiPlaidRouter)
app.use(validateRequestParams)
app.use("/api/auth", authRouter)

app.use("/api/profile", authenticateJWT, router)
app.use("/api/plaid", authenticateJWT, plaidRouter)
app.use("/api/watchlist", authenticateJWT, watchlistRouter)

mongoose
    .connect(mongoURI)
    .then(() => {
        console.log("Connected to MongoDB")
        console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET)

        // Start the server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`)
        })
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error)
    })
