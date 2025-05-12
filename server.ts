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


app.get("/.well-known/apple-app-site-association", (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const teamId = process.env.TEAMID
    const bundleId = process.env.BUNDLEID
    const associationFile = {
        "applinks": {
            "apps": [],
            "details": [
                {
                    "appID": [`${teamId}.${bundleId}`],
                    "paths": [
                        {
                            "/": ["/com-mind-earningscalendar/redirect"],
                            "comment": "Oauth redirect form plaid"

                        },
                    ]
                }
            ]
        }
    };

    // Send the response
    res.send(associationFile);
});

app.get("/.well-known/oauth-return", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Redirecting to app...</title>
      <meta http-equiv="refresh" content="0; URL=yourapp://plaid-oauth-return${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <p>Redirecting to your app...</p>
      <script>
        window.location.href = "yourapp://plaid-oauth-return${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}";
      </script>
    </body>
    </html>
  `);
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Debug middleware to log all requests
app.use((req, res, next) => {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    // console.log("Headers:", JSON.stringify(req.headers, null, 2))
    next()
})


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
