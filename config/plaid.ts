import dotenv from "dotenv"
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"

dotenv.config()

// Initialize Plaid client with your credentials
const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID || "",
            "PLAID-SECRET": process.env.PLAID_SECRET || "",
        },
    },
})

const plaidClient = new PlaidApi(configuration)

export default plaidClient
