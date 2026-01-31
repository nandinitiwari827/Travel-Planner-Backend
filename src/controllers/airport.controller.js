import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios"

let getAccessToken = async () => {
  try {
    let response = await axios.post(
      "https://test.api.amadeus.com/v1/security/oauth2/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.FLIGHT_API_KEY,
        client_secret: process.env.FLIGHT_API_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    return response.data.access_token
  } catch (error) {
    console.error(
      "Error getting Amadeus token (airports):",
      error.response?.data || error.message
    )
    throw new ApiError(500, "Failed to authenticate with Amadeus API")
  }
}

export let searchAirports = asyncHandler(async (req, res) => {
  let { keyword } = req.query

  if (!keyword || keyword.length < 2) {
    throw new ApiError(400, "Keyword must be at least 2 characters")
  }

  let token = await getAccessToken()

  let response = await axios.get(
    "https://test.api.amadeus.com/v1/reference-data/locations",
    {
      params: {
        subType: "AIRPORT",
        keyword,
        "page[limit]": 20,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  let airports = response.data.data.map((a) => ({
    name: a.name,
    city: a.address.cityName,
    country: a.address.countryName,
    code: a.iataCode,
  }))

  return res.status(200).json(new ApiResponse(200, airports, "Airports fetched"))
})