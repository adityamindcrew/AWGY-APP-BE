import type { Response } from "express"

export interface ApiResponse {
    status: boolean
    statusCode: number
    message: string
    data?: any
    error?: string
    details?: string
}

export const sendSuccess = (res: Response, message: string, data?: any, statusCode = 200): Response<ApiResponse> => {
    return res.status(statusCode).json({
        status: true,
        statusCode,
        message,
        data,
    })
}

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
        data: {},
    }

    // Only include error details in development environment
    if (details && process.env.NODE_ENV === "development") {
        response.details = details
    }

    return res.status(statusCode).json(response)
}

export const sendValidationError = (res: Response, message: string): Response<ApiResponse> => {
    return sendError(res, message, 400)
}

export const sendNotFound = (res: Response, message = "Resource not found"): Response<ApiResponse> => {
    return sendError(res, message, 404)
}

export const sendUnauthorized = (res: Response, message = "Unauthorized access"): Response<ApiResponse> => {
    return sendError(res, message, 401)
}


export const sendServerError = (res: Response, error: Error | any): Response<ApiResponse> => {
    const message = error.response.data.error_message
    const details = typeof error === "string" ? error : error.response.data.error_message
    return sendError(res, message, 500, details)
}
