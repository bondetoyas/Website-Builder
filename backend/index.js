import express from 'express'
import 'dotenv/config'
import connectDB from './database/db.js'
import authRoute from './routes/authRoute.js'
import websiteRoute from './routes/websiteRoute.js'
import paymentRoute from './routes/paymentRoute.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8000
const allowedOrigins = new Set([
    'http://localhost:5173',
    'https://doraai-1.onrender.com',
    'https://website-builder-1-i3ed.onrender.com',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    ...(process.env.CLIENT_URLS || '').split(',')
].filter(Boolean).map((origin) => {
    try {
        return new URL(origin.trim()).origin
    } catch {
        return null
    }
}).filter(Boolean))

//middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true)
        }
        return callback(new Error('Origin is not allowed by CORS'))
    },
    credentials: true
}))


app.use('/api/auth', authRoute)
app.use('/api/website', websiteRoute)
app.use('/api/payment', paymentRoute)


app.listen(PORT, ()=>{
    connectDB()
    console.log(`Server is listening at port : ${PORT}` )
})
