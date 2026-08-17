// PRD §5.1 "Vehicle Type Dropdown (standardized)" — labels match the PRD's
// wording exactly; values match the backend's VehicleType enum
// (backend/app/models/enums.py).
export const VEHICLE_TYPES: { value: string; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "compact", label: "Compact" },
  { value: "intermediate", label: "Intermediate" },
  { value: "standard", label: "Standard" },
  { value: "full_size", label: "Full Size" },
  { value: "standard_suv", label: "Standard SUV" },
  { value: "intermediate_suv", label: "Intermediate SUV" },
  { value: "premium_suv", label: "Premium SUV" },
  { value: "full_size_suv", label: "Full-Size SUV" },
  { value: "luxury", label: "Luxury" },
  { value: "passenger_van", label: "Passenger Van" },
  { value: "mini_van", label: "Mini Van" },
  { value: "fifteen_passenger_van", label: "15-Passenger Van" },
  { value: "mystery_car", label: "Mystery Car" },
  { value: "premium_crossover", label: "Premium Crossover" },
  { value: "premium_elite_crossover", label: "Premium Elite Crossover" },
  { value: "pickup_truck", label: "Pickup Truck" },
  { value: "electric", label: "Electric" },
];
