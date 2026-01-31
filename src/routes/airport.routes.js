import { Router } from "express";
import { searchAirports } from "../controllers/airport.controller.js";

let router = Router()

router.get("/search", searchAirports)

export default router