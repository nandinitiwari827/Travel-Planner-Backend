import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config()

let PORT = process.env.PORT || 10001

connectDB().then(()=>{
    app.listen(PORT, () => {
      console.log(`Server running at port: ${PORT}`)
    })
  }).catch((err)=>{
    console.log("connection failed !!!", err)
})