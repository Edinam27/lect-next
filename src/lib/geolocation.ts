import { getDistance } from 'geolib'

// UPSA Graduate School coordinates (Accra, Ghana)
const UPSA_COORDINATES = {
  latitude: parseFloat(process.env.UPSA_GPS_LATITUDE || '5.6037'),
  longitude: parseFloat(process.env.UPSA_GPS_LONGITUDE || '-0.1870')
}

const UPSA_RADIUS = parseInt(process.env.UPSA_GPS_RADIUS || '300') // meters

export interface Coordinates {
  latitude: number
  longitude: number
}

export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  return getDistance(point1, point2)
}

export function isWithinUPSARadius(userCoordinates: Coordinates): boolean {
  const distance = calculateDistance(userCoordinates, UPSA_COORDINATES)
  return distance <= UPSA_RADIUS
}

export function verifyLocationForAttendance(userCoordinates: Coordinates): {
  verified: boolean
  distance: number
  withinRadius: boolean
} {
  const distance = calculateDistance(userCoordinates, UPSA_COORDINATES)
  const withinRadius = distance <= UPSA_RADIUS
  
  return {
    verified: withinRadius,
    distance,
    withinRadius
  }
}

export function getUPSACoordinates(): Coordinates {
  return UPSA_COORDINATES
}

export function getUPSARadius(): number {
  return UPSA_RADIUS
}

// Validate coordinates format
export function isValidCoordinates(coordinates: any): coordinates is Coordinates {
  return (
    typeof coordinates === 'object' &&
    coordinates !== null &&
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  )
}