import type { Request, Response } from "express";
import { SandboxPublicTokenCreateRequest } from "plaid";
import plaidClient from "../config/plaid";
import PlaidItem from "../models/plaiditem";
import { sendNotFound, sendServerError, sendSuccess, sendValidationError } from "../utils/response-handler";

// Create a link token for Plaid Link
export const createLinkToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id;
        console.log('first tokenResponse', req.user)
        if (!userId) {
            return sendValidationError(res, "User ID is required");
        }

        // Create link token request with proper enum types
        const request: SandboxPublicTokenCreateRequest = {
            "institution_id": req.body.institution_id,
            "initial_products": req.body.initial_products,
        };

        // Call Plaid API
        const response = await plaidClient.sandboxPublicTokenCreate(request);

        return sendSuccess(res, "Link token created successfully", {
            linkToken: response.data
        });
    } catch (error: any) {
        console.error("Error creating link token:", error);
        return sendServerError(res, error);
    }
};

// Exchange public token for access token
export const exchangePublicToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const { public_token, institution } = req.body
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        if (!public_token || !institution) {
            return sendValidationError(res, "Public token and institution information are required")
        }

        // Exchange public token for access token
        const tokenResponse = await plaidClient.itemPublicTokenExchange({
            public_token: public_token,
        })
        const accessToken = tokenResponse.data.access_token
        const itemId = tokenResponse.data.item_id

        // Save the Plaid item to the database

        const plaidItem = await PlaidItem.findOne({ userId })
        if (plaidItem) {
            await PlaidItem.findOneAndUpdate({ userId }, { itemId, accessToken })
        } else {
            await PlaidItem.create({
                userId,
                accessToken,
                itemId,
                institutionId: institution.institution_id,
                institutionName: institution.name,
            })
        }

        return sendSuccess(res, "Account connected successfully", accessToken)
    } catch (error: any) {
        console.error("Error exchanging public token:", error)
        return sendServerError(res, error)
    }
}

// Get investment holdings
export const getHoldings = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return sendUnauthorized(res, "User not authenticated")
        }

        // Find all Plaid items for this user
        const plaidItems = await PlaidItem.find({ userId })

        if (!plaidItems || plaidItems.length === 0) {
            return sendNotFound(res, "No connected accounts found")
        }

        // Get holdings for each connected account
        const holdingsPromises = plaidItems.map(async (item) => {
            console.log("Accesstoken get successfully", item.accessToken)
            try {
                const response = await plaidClient.investmentsHoldingsGet({
                    access_token: item.accessToken,
                })
                console.log('first response', item.accessToken)
                const holdings = response.data.holdings
                const securities = response.data.securities
                const accounts = response.data.accounts

                // Format the holdings data
                const formattedHoldings = holdings.map((holding) => {
                    const security = securities.find((s) => s.security_id === holding.security_id)
                    const account = accounts.find((a) => a.account_id === holding.account_id)

                    return {
                        id: holding.security_id,
                        name: security?.name || "Unknown",
                        symbol: security?.ticker_symbol || "Unknown",
                        quantity: holding.quantity,
                        value: holding.institution_value,
                        accountName: account?.name || "Unknown Account",
                        accountType: account?.type || "Unknown Type",
                    }
                })

                return {
                    institution: item.institutionName,
                    holdings: formattedHoldings,
                }
            } catch (error: any) {
                console.error(`Error fetching holdings for item ${item.itemId}:`, error)
                return {
                    institution: item.institutionName,
                    error: "Unable to fetch holdings",
                    holdings: [],
                }
            }
        })

        const allHoldings = await Promise.all(holdingsPromises)

        return sendSuccess(res, "Holdings retrieved successfully", { holdings: allHoldings })
    } catch (error: any) {
        console.error("Error fetching holdings:", error)
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
