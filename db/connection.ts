import mongoose from "mongoose"

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/Bank-App"

// Create a function to connect to MongoDB using Mongoose
const connectDb = async () => {
    try {
        await mongoose.connect(mongoURI)
        console.log("Connected to MongoDB via Mongoose")
        return mongoose.connection
    } catch (error) {
        console.error("Error connecting to MongoDB:", error)
        throw error
    }
}

// Get the mongoose connection
const getDb = () => mongoose.connection

export default {
    connectDb,
    getDb,
}
