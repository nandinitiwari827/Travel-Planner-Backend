import { searchFlights } from "../controllers/flight.controller.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

let router=Router();

router.route("/search").post(searchFlights, verifyJWT)

export default router