import type { Response } from "express"

/**
 * Standard API response format
 */
export interface ApiResponse {
    status: boolean
    statusCode: number
    message: string
    data?: any
    error?: string
    details?: string
}

/**
 * Creates a standardized success response
 * @param res Express response object
 * @param message Success message
 * @param data Optional data to include in response
 * @param statusCode HTTP status code (defaults to 200)
 */
export const sendSuccess = (res: Response, message: string, data?: any, statusCode = 200): Response<ApiResponse> => {
    return res.status(statusCode).json({
        status: true,
        statusCode,
        message,
        data,
    })
}

/**
 * Creates a standardized error response
 * @param res Express response object
 * @param message Error message
 * @param statusCode HTTP status code (defaults to 400)
 * @param details Optional error details (only included in development)
 */
export const sendError = (
    res: Response,
    message: string,
    statusCode = 400,
    details?: string,
): Response<ApiResponse> => {
    const response: ApiResponse = {
        status: false,
        statusCode,
        message,
    }

    // Only include error details in development environment
    if (details && process.env.NODE_ENV === "development") {
        response.details = details
    }

    return res.status(statusCode).json(response)
}

/**
 * Creates a standardized validation error response
 * @param res Express response object
 * @param message Validation error message
 */
export const sendValidationError = (res: Response, message: string): Response<ApiResponse> => {
    return sendError(res, message, 400)
}

/**
 * Creates a standardized not found error response
 * @param res Express response object
 * @param message Not found error message
 */
export const sendNotFound = (res: Response, message = "Resource not found"): Response<ApiResponse> => {
    return sendError(res, message, 404)
}

/**
 * Creates a standardized unauthorized error response
 * @param res Express response object
 * @param message Unauthorized error message
 */
export const sendUnauthorized = (res: Response, message = "Unauthorized access"): Response<ApiResponse> => {
    return sendError(res, message, 401)
}


export const sendServerError = (res: Response, error: Error | any): Response<ApiResponse> => {
    const message = error.response.data.error_message
    const details = typeof error === "string" ? error : error.response.data.error_message
    return sendError(res, message, 500, details)
}
