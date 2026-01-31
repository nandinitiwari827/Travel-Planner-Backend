import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

let app=express()

app.use(cors({
     origin: true,
     credentials: true
}))

app.use(express.json({limit: "500mb"}))
app.use(express.urlencoded({extended: true, limit: "500mb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.routes.js"
import flightRouter from "./routes/flight.routes.js"
import bookingRouter from "./routes/booking.routes.js"
import airportRouter from "./routes/airport.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/flights", flightRouter)
app.use("/api/v1/bookings", bookingRouter)
app.use("/airports", airportRouter)

export {app}

