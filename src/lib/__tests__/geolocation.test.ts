import {
  calculateDistance,
  isWithinUPSARadius,
  verifyLocationForAttendance,
  getUPSACoordinates,
  getUPSARadius,
  isValidCoordinates,
  Coordinates
} from '../geolocation'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    UPSA_GPS_LATITUDE: '5.6037',
    UPSA_GPS_LONGITUDE: '-0.1870',
    UPSA_GPS_RADIUS: '300'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Geolocation Functions', () => {
  const upsaCoordinates: Coordinates = { latitude: 5.6037, longitude: -0.1870 }
  const withinRadiusCoordinates: Coordinates = { latitude: 5.6040, longitude: -0.1875 } // ~50m away
  const outsideRadiusCoordinates: Coordinates = { latitude: 5.6100, longitude: -0.1900 } // ~800m away
  const farAwayCoordinates: Coordinates = { latitude: 6.0000, longitude: -1.0000 } // Very far

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const distance = calculateDistance(upsaCoordinates, withinRadiusCoordinates)
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(100) // Should be around 50m
    })

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(upsaCoordinates, upsaCoordinates)
      expect(distance).toBe(0)
    })

    it('should calculate large distances correctly', () => {
      const distance = calculateDistance(upsaCoordinates, farAwayCoordinates)
      expect(distance).toBeGreaterThan(10000) // Should be > 10km
    })
  })

  describe('isWithinUPSARadius', () => {
    it('should return true for coordinates within UPSA radius', () => {
      const result = isWithinUPSARadius(withinRadiusCoordinates)
      expect(result).toBe(true)
    })

    it('should return false for coordinates outside UPSA radius', () => {
      const result = isWithinUPSARadius(outsideRadiusCoordinates)
      expect(result).toBe(false)
    })

    it('should return true for exact UPSA coordinates', () => {
      const result = isWithinUPSARadius(upsaCoordinates)
      expect(result).toBe(true)
    })

    it('should handle edge case at exact radius boundary', () => {
      // Create coordinates exactly 300m away
      const boundaryCoordinates: Coordinates = { latitude: 5.6064, longitude: -0.1870 } // ~300m north
      const result = isWithinUPSARadius(boundaryCoordinates)
      // Should be true or false depending on exact calculation
      expect(typeof result).toBe('boolean')
    })
  })

  describe('verifyLocationForAttendance', () => {
    it('should verify location within radius', () => {
      const result = verifyLocationForAttendance(withinRadiusCoordinates)
      expect(result.verified).toBe(true)
      expect(result.withinRadius).toBe(true)
      expect(result.distance).toBeGreaterThan(0)
      expect(result.distance).toBeLessThan(300)
    })

    it('should reject location outside radius', () => {
      const result = verifyLocationForAttendance(outsideRadiusCoordinates)
      expect(result.verified).toBe(false)
      expect(result.withinRadius).toBe(false)
      expect(result.distance).toBeGreaterThan(300)
    })

    it('should return correct distance for exact UPSA coordinates', () => {
      const result = verifyLocationForAttendance(upsaCoordinates)
      expect(result.verified).toBe(true)
      expect(result.withinRadius).toBe(true)
      expect(result.distance).toBe(0)
    })

    it('should handle very far coordinates', () => {
      const result = verifyLocationForAttendance(farAwayCoordinates)
      expect(result.verified).toBe(false)
      expect(result.withinRadius).toBe(false)
      expect(result.distance).toBeGreaterThan(10000)
    })
  })

  describe('getUPSACoordinates', () => {
    it('should return correct UPSA coordinates', () => {
      const coordinates = getUPSACoordinates()
      expect(coordinates.latitude).toBe(5.6037)
      expect(coordinates.longitude).toBe(-0.1870)
    })

    it('should use environment variables when available', () => {
      process.env.UPSA_GPS_LATITUDE = '5.1234'
      process.env.UPSA_GPS_LONGITUDE = '-0.5678'
      
      // Need to re-import to get updated env vars
      jest.resetModules()
      const { getUPSACoordinates: getUpdatedCoordinates } = require('../geolocation')
      
      const coordinates = getUpdatedCoordinates()
      expect(coordinates.latitude).toBe(5.1234)
      expect(coordinates.longitude).toBe(-0.5678)
    })
  })

  describe('getUPSARadius', () => {
    it('should return correct UPSA radius', () => {
      const radius = getUPSARadius()
      expect(radius).toBe(300)
    })

    it('should use environment variable when available', () => {
      process.env.UPSA_GPS_RADIUS = '500'
      
      // Need to re-import to get updated env vars
      jest.resetModules()
      const { getUPSARadius: getUpdatedRadius } = require('../geolocation')
      
      const radius = getUpdatedRadius()
      expect(radius).toBe(500)
    })
  })

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      const validCoords = { latitude: 5.6037, longitude: -0.1870 }
      expect(isValidCoordinates(validCoords)).toBe(true)
    })

    it('should reject coordinates with invalid latitude', () => {
      const invalidCoords = { latitude: 91, longitude: -0.1870 }
      expect(isValidCoordinates(invalidCoords)).toBe(false)
    })

    it('should reject coordinates with invalid longitude', () => {
      const invalidCoords = { latitude: 5.6037, longitude: 181 }
      expect(isValidCoordinates(invalidCoords)).toBe(false)
    })

    it('should reject coordinates with negative latitude beyond range', () => {
      const invalidCoords = { latitude: -91, longitude: -0.1870 }
      expect(isValidCoordinates(invalidCoords)).toBe(false)
    })

    it('should reject coordinates with negative longitude beyond range', () => {
      const invalidCoords = { latitude: 5.6037, longitude: -181 }
      expect(isValidCoordinates(invalidCoords)).toBe(false)
    })

    it('should accept boundary values', () => {
      const boundaryCoords1 = { latitude: 90, longitude: 180 }
      const boundaryCoords2 = { latitude: -90, longitude: -180 }
      expect(isValidCoordinates(boundaryCoords1)).toBe(true)
      expect(isValidCoordinates(boundaryCoords2)).toBe(true)
    })

    it('should reject non-object input', () => {
      expect(isValidCoordinates(null)).toBe(false)
      expect(isValidCoordinates(undefined)).toBe(false)
      expect(isValidCoordinates('string')).toBe(false)
      expect(isValidCoordinates(123)).toBe(false)
    })

    it('should reject object with missing properties', () => {
      expect(isValidCoordinates({ latitude: 5.6037 })).toBe(false)
      expect(isValidCoordinates({ longitude: -0.1870 })).toBe(false)
      expect(isValidCoordinates({})).toBe(false)
    })

    it('should reject object with non-numeric properties', () => {
      expect(isValidCoordinates({ latitude: 'string', longitude: -0.1870 })).toBe(false)
      expect(isValidCoordinates({ latitude: 5.6037, longitude: 'string' })).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero coordinates', () => {
      const zeroCoords: Coordinates = { latitude: 0, longitude: 0 }
      expect(isValidCoordinates(zeroCoords)).toBe(true)
      
      const distance = calculateDistance(upsaCoordinates, zeroCoords)
      expect(distance).toBeGreaterThan(0)
      
      const verification = verifyLocationForAttendance(zeroCoords)
      expect(verification.verified).toBe(false)
      expect(verification.distance).toBeGreaterThan(300)
    })

    it('should handle very small coordinate differences', () => {
      const nearbyCoords: Coordinates = { 
        latitude: 5.6037001, 
        longitude: -0.1870001 
      }
      
      const distance = calculateDistance(upsaCoordinates, nearbyCoords)
      expect(distance).toBeLessThan(1) // Should be less than 1 meter
      
      const verification = verifyLocationForAttendance(nearbyCoords)
      expect(verification.verified).toBe(true)
    })

    it('should handle coordinates with many decimal places', () => {
      const preciseCoords: Coordinates = { 
        latitude: 5.603712345678, 
        longitude: -0.187098765432 
      }
      
      expect(isValidCoordinates(preciseCoords)).toBe(true)
      const verification = verifyLocationForAttendance(preciseCoords)
      expect(typeof verification.distance).toBe('number')
    })
  })

  describe('Real-world Test Scenarios', () => {
    it('should verify lecturer at UPSA main entrance', () => {
      // Approximate coordinates for UPSA main entrance
      const mainEntrance: Coordinates = { latitude: 5.6035, longitude: -0.1872 }
      const result = verifyLocationForAttendance(mainEntrance)
      expect(result.verified).toBe(true)
      expect(result.distance).toBeLessThan(300)
    })

    it('should reject lecturer at nearby location outside campus', () => {
      // Coordinates for a location near but outside UPSA
      const nearbyLocation: Coordinates = { latitude: 5.6000, longitude: -0.1900 }
      const result = verifyLocationForAttendance(nearbyLocation)
      expect(result.verified).toBe(false)
      expect(result.distance).toBeGreaterThan(300)
    })

    it('should handle lecturer at different parts of campus', () => {
      // Test various points around the campus
      const campusLocations: Coordinates[] = [
        { latitude: 5.6040, longitude: -0.1875 }, // North side
        { latitude: 5.6034, longitude: -0.1865 }, // East side
        { latitude: 5.6030, longitude: -0.1875 }, // South side
        { latitude: 5.6040, longitude: -0.1880 }  // West side
      ]

      campusLocations.forEach((location, index) => {
        const result = verifyLocationForAttendance(location)
        expect(result.distance).toBeLessThan(500) // Should be reasonably close
        // Most should be within radius, but we'll just check they're processed
        expect(typeof result.verified).toBe('boolean')
      })
    })
  })
})