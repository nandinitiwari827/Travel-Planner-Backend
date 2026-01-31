import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import {countries} from "countries-list"

let validCountries = Object.values(countries)
 .filter(c => c.name && typeof c.name === 'string')
.map(c=>c.name.toLowerCase())

let passengerSchema=new Schema({
   fullName: {
            type: String, 
            required: true
        },
        age: {
            type: Number,
            required: true,
            min: 0
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true
        },
        email: {
            required: true,
            type: String,
            match: [/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, "email should be in correct format"]
        },
        phoneNumber: {
            type: Number,
            required: true,
            match: [/^[0-9]{10}$/, "Phone number should be of 10 digits"]
        },
        city: {
             type: String,
             required: true,
             match: [/^[A-Za-z\s-]+$/, "City must contain only letters, spaces, or hyphens"]
        }, 
        state: {
             type: String,
            required: true,
            match: [/^[A-Za-z\s-]+$/, "State must contain only letters, spaces, or hyphens"]
        }, 
        country: {
             type: String,
            required: true,
            lowercase: true,
            validate: {
                validator: function(value){
                    return validCountries.includes(value.toLowerCase())
                }, message: "Invalid country name"
            }
        }, 
        postalCode: {
             type: String,
            required: true,
            match: [/^[A-Za-z0-9\s-]{3,10}$/, "Invalid postal code format"]
        },
        passportNumber: {
            type: String,
            required: true,
        }, 
        travelClass: {
            type: String,
            enum: ["Economy", "Business", "First"],
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
         seatAlloted: {
         type: String,
        required: true
    },
})

let priceBreakdownSchema=new Schema({
    baseFare: {
        type: Number,
        required: true,
        default: 0
    }, 
    taxes: {
         type: Number,
        required: true,
        default: 0
    }, 
    serviceCharges: {
         type: Number,
        required: true,
        default: 0
    }, 
    totalPrice: {
         type: Number,
        required: true,
        default: 0
    }, 
    numberOfPassengers: {
         type: Number,
        required: true,
        default: 1,
        min: 1
    }
})

let airportSchema = new Schema({
    name: {
        type: String,
        required: true,
        default: "Unknown"
    },
    city: {
        type: String,
        required: true,
        default: "Unknown"
    },
    country: {
        type: String,
        required: true,
        default: "Unknown"
    }
});

let bookingSchema=new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
     flightNumber: {
        type: String,
        required: true
    },
    airline: {
        type: String,
        required: true
    }, 
    from: {
         type: String,
        required: true
    }, 
    to: {
         type: String,
        required: true
    }, 
     departureDate: {
              type: Date,
        required: true,
       validate: {
            validator: function(value) {
                let today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: "Departure date must be today or in the future"
        }},
    departureTime: {
         type: Date,
        required: true
    },
     arrivalTime: {
         type: Date,
        required: true
     },
     stops: {
     type: Number,
     default: 0
      },
     adults: {
        type: Number,
        required: true,
        default: 1
    }, 
        children: {
        type: Number,
        required: true,
        default: 0
        },
    passenger: [passengerSchema], 
       
        paymentMethod: {
            type: String,
            enum: ["UPI", "NETBANKING", "CARD"],
            default: "UPI",
            required: true
        },
        bookingStatus: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "CANCELLED"],
            default: "CONFIRMED"
        },
        priceBreakdown: priceBreakdownSchema,
        fromAirport: airportSchema,
        toAirport: airportSchema
    },  {timestamps: true})

bookingSchema.plugin(mongooseAggregatePaginate);
export let Booking=mongoose.model("Booking", bookingSchema);