import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

let getAccessToken = async()=>{
    try{
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
        )
        return response.data.access_token
    }catch(error){
        console.error("Error getting Amadeus token", error.response?.data || error.message)
        throw new ApiError(500, "Failed to authenticate with Amadeus API")
    }
}

export let searchFlights=asyncHandler(async(req, res)=>{
    let {from, to, date, classType, adults=1, children=0}=req.body;

    if(!from || !to || !date || !classType){
        throw new ApiError(400, "All fields should be filled")
    }

    try{
        let token = await getAccessToken()
        let response=await axios.get("https://test.api.amadeus.com/v2/shopping/flight-offers", {
            params: {
                originLocationCode: from,
                destinationLocationCode: to,
                departureDate: date,
                adults,
                children,
                travelClass: classType.toUpperCase(),
                currencyCode: "INR"
            },
            headers: {
        Authorization: `Bearer ${token}`
      }
        })


//       let flights=response.data.data.map(f=>({
//       airline: f.itineraries[0].segments[0].carrierCode,
//       flightNumber: f.itineraries[0].segments[0].number,
//       from,
//       to,
//       departureDate: f.itineraries[0].segments[0].departure.at,
//       departureTime: f.itineraries[0].segments[0].departure.at,
//       arrivalTime: f.itineraries[0].segments[0].arrival.at,
//       stops: segments.length - 1,
//       prices: {
//     Economy: Number(f.price.total),
//     Business: Number(f.price.total * 2),  
//     First: Number(f.price.total * 3)      
//   },
//       selectedClass: classType.toUpperCase(),
//       currency: f.price.currency 
//         }
//     ))

let flights = response.data.data.map((f) => {
  let segments = f.itineraries[0].segments      
  let firstSeg = segments[0]
  let lastSeg = segments[segments.length - 1]

  return {
    airline: firstSeg.carrierCode,
    flightNumber: firstSeg.number,
    from,
    to,
    departureDate: firstSeg.departure.at,
    departureTime: firstSeg.departure.at,
    arrivalTime: lastSeg.arrival.at,             
    stops: segments.length - 1,                 

    prices: {
      Economy: Number(f.price.total),
      Business: Number(f.price.total * 2),
      First: Number(f.price.total * 3),
    },

    selectedClass: classType.toUpperCase(),
    currency: f.price.currency,
  }
})

    return res.status(200).json(new ApiResponse(200, flights, "Flights fetched successfully"))
    }catch(error){
        console.error(error.response?.data || error.message)
        throw new ApiError(500, "Error fetching flights from API")
    }
})
