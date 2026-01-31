import { Booking } from "../models/booking.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

let getAccessToken = async () => {
 try {
        let response = await axios.post(
            "https://test.api.amadeus.com/v1/security/oauth2/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: process.env.FLIGHT_API_KEY,
                client_secret: process.env.FLIGHT_API_SECRET,
            }),
            { headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }}
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting Amadeus token", error.response?.data || error.message);
        throw new ApiError(500, "Failed to authenticate with Amadeus API");
    }
}

let getAirportDetails = async (iataCode, token) => {
    try {
        let response = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${iataCode}`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );
        let data = response.data;
        if (!data.data || data.data.length === 0) {
            console.error(`No airport data found for IATA code: ${iataCode}`);
            return {
                name: "Unknown",
                city: "Unknown",
                country: "Unknown"
            };
        }
        let airport = data.data.find(loc => loc.iataCode === iataCode) || data.data[0];
        return {
            name: airport.name || "Unknown",
            city: airport.address?.cityName || "Unknown",
            country: airport.address?.countryName || "Unknown"
        };
    } catch (error) {
        console.error(`Error fetching airport details for ${iataCode}:`, error.message);
        return {
            name: "Unknown",
            city: "Unknown",
            country: "Unknown"
        };
    }
}

let createBooking = asyncHandler(async(req, res)=>{
    let {flightData, passengers, paymentMethod, departureDate}=req.body;

    if(!departureDate || !flightData || !flightData.flightNumber || !flightData.airline || !flightData.from ||
         !flightData.to || !flightData.departureDate || !flightData.departureTime || !flightData.arrivalTime ||
         !flightData.arrivalTime || !flightData.prices || !flightData.currency || !passengers || 
          !Array.isArray(passengers) || passengers.length<1){
        throw new ApiError(400, "Flight details and at least one passenger are required")
    }

    if(flightData.to===flightData.from){
        throw new ApiError(404, "Source and destination for flight cannot be same")
    }

    let token = await getAccessToken();
    let fromAirport = await getAirportDetails(flightData.from, token);
    let toAirport = await getAirportDetails(flightData.to, token);

    let baseFare=0

   let classMap = {
    ECONOMY: "Economy",
    BUSINESS: "Business",
    FIRST: "First"
}

let selectedClass = flightData.selectedClass.charAt(0).toUpperCase() +
  flightData.selectedClass.slice(1).toLowerCase();
let priceNumber = Number(flightData.prices[selectedClass]); 
if (isNaN(priceNumber)) throw new ApiError(400, "Invalid flight price");

   let depDate = new Date(departureDate);
    if (isNaN(depDate.getTime())) throw new ApiError(400, "Invalid departure date");
   let today = new Date();
    today.setHours(0, 0, 0, 0)
    if (depDate < today) throw new ApiError(400, "Departure date must be today or in the future");
    
   passengers.forEach((p) => {
    p.travelClass = selectedClass;
    p.price = priceNumber
    p.seatAlloted = uuidv4().slice(0, 4).toUpperCase()
    p.departureDate = depDate;
    baseFare += p.price;
})

    let taxes=baseFare*0.18
    let serviceCharges=200;
    let totalPrice=baseFare+taxes+serviceCharges

    let booking = await Booking.create({
        user: req.user._id,
        flightNumber: flightData.flightNumber,
        airline: flightData.airline,
        from: flightData.from,
        to: flightData.to,
        departureDate: depDate,
        departureTime: new Date(flightData.departureTime),
        arrivalTime: new Date(flightData.arrivalTime),
        stops: flightData.stops ?? 0,
        adults: passengers.filter((p) => p.age >= 18).length,
        children: passengers.filter((p) => p.age < 18).length,
        passenger: passengers,
        paymentMethod,
        fromAirport,
        toAirport,
        priceBreakdown: {
            baseFare,
            taxes,
            serviceCharges,
            totalPrice,
            numberOfPassengers: passengers.length
        },
    })

    return res.status(200).json(new ApiResponse(200, booking, "Booking created successfully"))
})

let getAllBookings=asyncHandler(async(req, res)=>{
    let bookings = await Booking.find({ user: req.user._id})
    .sort({createdAt: -1})

    return res.status(200).json(new ApiResponse(200, bookings, "Bookings fetched successfully"))
})

let getBookingById=asyncHandler(async(req, res)=>{
    let booking = await Booking.findById(req.params.id)
    if(!booking){
        throw new ApiError(404, "Booking not found")
    }
    
    return res.status(200).json(new ApiResponse(200, booking, "Booking details fetched successfully"))
})

let cancelBooking=asyncHandler(async(req, res)=>{
    let booking= await  Booking.findOne({
  _id: req.params.id,
  user: req.user._id
   })
    if(!booking){
        throw new ApiError(404, "Booking not found")
    }

    if (booking.bookingStatus === "CANCELLED") {
    throw new ApiError(400, "Booking already cancelled")
   }

    booking.bookingStatus="CANCELLED"
    await booking.save()
    
    return res.status(200).json(new ApiResponse(200, "Booking cancelled successfully"))
})

export{createBooking, getAllBookings, getBookingById, cancelBooking}