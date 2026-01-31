import { Router } from "express";
import { createBooking, cancelBooking, getAllBookings, getBookingById } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

let router = Router();
router.use(verifyJWT);

router.route("/create").post(createBooking)
router.route("/bookings").get(getAllBookings)
router.route("/:id").get(getBookingById).post(cancelBooking)

export default router