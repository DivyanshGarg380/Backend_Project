import mongoose from "mongoose";
import { DB_NAME } from "./constants"
( async () => {
    try{
        mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    }catch(error){
        console.log("ERROR: ",error);
        throw err
    }
})()