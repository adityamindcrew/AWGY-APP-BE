import type { NextFunction, Request, Response } from "express"

export interface RequiredParams {
    isStaging: string
    deviceid: string
    camefrom: string
    appversion: string
}

export const validateRequestParams = (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for specific paths like static files

    if (req.path == "/api/profile/profilepicture" || req.path.startsWith("/uploads/")) {
        return next()
    }
    // For multipart/form-data requests (file uploads)
    if (req.is("multipart/form-data")) {
        // Check form fields
        const formParams = {
            isStaging: req.body.isStaging,
            deviceid: req.body.deviceid,
            camefrom: req.body.camefrom,
            appversion: req.body.appversion,
        }

        // Check if any required parameter is missing
        const missingParams = Object.entries(formParams)
            .filter(([_, value]) => value === undefined || value === null || value === "")
            .map(([key]) => key)

        if (missingParams.length > 0) {
            return res.status(400).json({
                status: false,
                statusCode: res.statusCode,
                message: "Missing required parameters in form data",
                missingParams,
            })
        }

        // Store validated parameters in request object for use in route handlers
        req.clientInfo = formParams as RequiredParams
        return next()
    }

    // For JSON requests
    // Check if body exists and is an object
    if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({
            status: false,
            statusCode: res.statusCode,
            message: "Request body is required and must be an object",
            data: null
        })
    }

    // Check body parameters
    const bodyParams = {
        isStaging: req.body.isStaging,
        deviceid: req.body.deviceid,
        camefrom: req.body.camefrom,
        appversion: req.body.appversion,
    }

    // Check if any required parameter is missing
    const missingParams = Object.entries(bodyParams)
        .filter(([_, value]) => value === undefined || value === null || value === "")
        .map(([key]) => key)

    if (missingParams.length > 0) {
        return res.status(400).json({
            status: false,
            statusCode: res.statusCode,
            message: `Missing required parameters ${missingParams.join(", ")} in request body`,
            data: null
        })
    }
    req.clientInfo = bodyParams as RequiredParams

    next()
}
declare global {
    namespace Express {
        interface Request {
            clientInfo?: RequiredParams
        }
    }
}
