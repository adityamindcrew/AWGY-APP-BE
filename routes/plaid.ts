import express from "express"
import { createLinkToken, createLinkTokenForIOS, exchangePublicToken, getHoldings } from "../controller/plaidContoller"
import { authenticateJWT } from "../middleware/auths"

const plaidRouter = express.Router()

// All routes require authentication
plaidRouter.use(authenticateJWT)

plaidRouter.post("/link-token", createLinkTokenForIOS);
plaidRouter.post("/create-link-token", createLinkToken)

// Exchange public token for access token
plaidRouter.post("/exchange-public-token", exchangePublicToken)

const getApiPlaidRouter = express.Router()
getApiPlaidRouter.get("/holdings", getHoldings)//pl

export { getApiPlaidRouter, plaidRouter }; //module.exports = router

