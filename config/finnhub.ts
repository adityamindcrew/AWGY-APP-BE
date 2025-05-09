import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ""
const BASE_URL = "https://finnhub.io/api/v1"

// Define response types
export interface QuoteResponse {
    c: number // Current price
    d: number // Change
    dp: number // Percent change
    h: number // High price of the day
    l: number // Low price of the day
    o: number // Open price of the day
    pc: number // Previous close price
    t: number // Timestamp
}

export interface SymbolSearchResponse {
    count: number
    result: Array<{
        description: string
        displaySymbol: string
        symbol: string
        type: string
    }>
}

export interface EarningsResponse {
    actual: number | null
    estimate: number | null
    period: string
    symbol: string
    surprise: number | null
    surprisePercent: number | null
}

export interface CompanyProfileResponse {
    country: string
    currency: string
    exchange: string
    ipo: string
    marketCapitalization: number
    name: string
    phone: string
    shareOutstanding: number
    ticker: string
    weburl: string
    logo: string
    finnhubIndustry: string
}

export interface CandlesResponse {
    c: number[] // Close prices
    h: number[] // High prices
    l: number[] // Low prices
    o: number[] // Open prices
    s: string // Status
    t: number[] // Timestamps
    v: number[] // Volumes
}

// Create the FinnHub client
const finnhubClient = {
    // Get real-time quote data
    quote: async (symbol: string): Promise<QuoteResponse> => {
        try {
            const response = await axios.get(`${BASE_URL}/quote`, {
                params: {
                    symbol,
                    token: FINNHUB_API_KEY,
                },
            })
            return response.data
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error)
            throw error
        }
    },

    // Search for symbols
    symbolSearch: async (query: string): Promise<SymbolSearchResponse> => {
        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: {
                    q: query,
                    token: FINNHUB_API_KEY,
                },
            })
            return response.data
        } catch (error) {
            console.error(`Error searching for "${query}":`, error)
            throw error
        }
    },

    // Get company earnings
    companyEarnings: async (symbol: string): Promise<EarningsResponse[]> => {
        try {
            const response = await axios.get(`${BASE_URL}/stock/earnings`, {
                params: {
                    symbol,
                    token: FINNHUB_API_KEY,
                },
            })
            return response.data
        } catch (error) {
            console.error(`Error fetching earnings for ${symbol}:`, error)
            throw error
        }
    },

    // Get company profile
    companyProfile: async (symbol: string): Promise<CompanyProfileResponse> => {
        try {
            const response = await axios.get(`${BASE_URL}/stock/profile2`, {
                params: {
                    symbol,
                    token: FINNHUB_API_KEY,
                },
            })
            return response.data
        } catch (error) {
            console.error(`Error fetching company profile for ${symbol}:`, error)
            throw error
        }
    },

    // Get stock candles for charts
    stockCandles: async (symbol: string, resolution: string, from: number, to: number): Promise<CandlesResponse> => {
        try {
            const response = await axios.get(`${BASE_URL}/stock/candle`, {
                params: {
                    symbol,
                    resolution,
                    from,
                    to,
                    token: FINNHUB_API_KEY,
                },
            })
            return response.data
        } catch (error) {
            console.error(`Error fetching candles for ${symbol}:`, error)
            throw error
        }
    },
}

export default finnhubClient
