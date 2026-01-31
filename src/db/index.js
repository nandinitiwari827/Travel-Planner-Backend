import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

let connectDB=async()=>{
    try{
        let connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n Database connected !!!: ${connectionInstance.connection.host}`)
    }catch(error){
        console.error("Database connection error", error)
        process.exit(1)
    }
}

export default connectDB