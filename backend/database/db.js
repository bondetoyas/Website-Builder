import mongoose from "mongoose"
import dns from "dns"
dns.setServers(['8.8.8.8','8.8.4.4'])

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('MongoDB connected successfully')
    } catch (error) {
        console.log('MongoDB connection error', error)
    }
}

export default connectDB