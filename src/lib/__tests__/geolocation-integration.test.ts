import {
  calculateDistance,
  isWithinUPSARadius,
  verifyLocationForAttendance,
  getUPSACoordinates,
  getUPSARadius,
  isValidCoordinates,
  Coordinates
} from '../geolocation'

describe('Geolocation Integration Tests', () => {
  const upsaCoordinates = getUPSACoordinates()
  const upsaRadius = getUPSARadius()

  describe('Real-world UPSA Campus Scenarios', () => {
    it('should verify attendance at UPSA main building', () => {
      // Coordinates for UPSA main building (approximate)
      const mainBuilding: Coordinates = {
        latitude: 5.6037,
        longitude: -0.1870
      }

      const result = verifyLocationForAttendance(mainBuilding)
      
      expect(result.verified).toBe(true)
      expect(result.withinRadius).toBe(true)
      expect(result.distance).toBe(0) // Exact coordinates
    })

    it('should verify attendance at UPSA library', () => {
      // Coordinates for UPSA library (approximate, within campus)
      const library: Coordinates = {
        latitude: 5.6040,
        longitude: -0.1875
      }

      const result = verifyLocationForAttendance(library)
      
      expect(result.verified).toBe(true)
      expect(result.withinRadius).toBe(true)
      expect(result.distance).toBeLessThan(300) // Within 300m radius
    })

    it('should reject attendance at nearby shopping center', () => {
      // Coordinates for a location outside UPSA campus
      const shoppingCenter: Coordinates = {
        latitude: 5.6100,
        longitude: -0.1900
      }

      const result = verifyLocationForAttendance(shoppingCenter)
      
      expect(result.verified).toBe(false)
      expect(result.withinRadius).toBe(false)
      expect(result.distance).toBeGreaterThan(300) // Outside 300m radius
    })

    it('should reject attendance at Kotoka International Airport', () => {
      // Coordinates for Kotoka International Airport (far from UPSA)
      const airport: Coordinates = {
        latitude: 5.6052,
        longitude: -0.1668
      }

      const result = verifyLocationForAttendance(airport)
      
      expect(result.verified).toBe(false)
      expect(result.withinRadius).toBe(false)
      expect(result.distance).toBeGreaterThan(1000) // Very far from campus
    })
  })

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle coordinates exactly at the radius boundary', () => {
      // Calculate a point exactly 300m away from UPSA
      const boundaryPoint: Coordinates = {
        latitude: upsaCoordinates.latitude + 0.0027, // Approximately 300m north
        longitude: upsaCoordinates.longitude
      }

      const distance = calculateDistance(upsaCoordinates, boundaryPoint)
      const result = verifyLocationForAttendance(boundaryPoint)
      
      // Distance should be close to 300m (within 10m tolerance)
      expect(Math.abs(distance - 300)).toBeLessThan(10)
      
      // Result depends on exact calculation, but should be consistent
      expect(typeof result.verified).toBe('boolean')
      expect(result.distance).toBeCloseTo(300, -1) // Allow 10m tolerance
    })

    it('should handle very precise coordinates', () => {
      const preciseCoordinates: Coordinates = {
        latitude: 5.603712345678901,
        longitude: -0.187098765432109
      }

      expect(isValidCoordinates(preciseCoordinates)).toBe(true)
      
      const result = verifyLocationForAttendance(preciseCoordinates)
      expect(typeof result.verified).toBe('boolean')
      expect(typeof result.distance).toBe('number')
      expect(result.distance).toBeGreaterThanOrEqual(0)
    })

    it('should handle coordinates with minimal differences', () => {
      const nearbyPoint: Coordinates = {
        latitude: upsaCoordinates.latitude + 0.000001, // ~0.1m difference
        longitude: upsaCoordinates.longitude + 0.000001
      }

      const distance = calculateDistance(upsaCoordinates, nearbyPoint)
      const result = verifyLocationForAttendance(nearbyPoint)
      
      expect(distance).toBeLessThan(1) // Less than 1 meter
      expect(result.verified).toBe(true)
      expect(result.withinRadius).toBe(true)
    })
  })

  describe('Configuration and Environment', () => {
    it('should use correct UPSA coordinates from environment', () => {
      const coordinates = getUPSACoordinates()
      
      expect(coordinates.latitude).toBe(5.6037)
      expect(coordinates.longitude).toBe(-0.1870)
    })

    it('should use correct radius from environment', () => {
      const radius = getUPSARadius()
      
      expect(radius).toBe(300)
    })

    it('should validate coordinates properly', () => {
      // Valid coordinates
      expect(isValidCoordinates({ latitude: 5.6037, longitude: -0.1870 })).toBe(true)
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true)
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true)
      
      // Invalid coordinates
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false)
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false)
      expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false)
      expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false)
      expect(isValidCoordinates(null)).toBe(false)
      expect(isValidCoordinates(undefined)).toBe(false)
      expect(isValidCoordinates('invalid')).toBe(false)
    })
  })

  describe('Performance and Accuracy', () => {
    it('should calculate distances accurately using Haversine formula', () => {
      // Test known distance between two points in Accra
      const point1: Coordinates = { latitude: 5.6037, longitude: -0.1870 } // UPSA
      const point2: Coordinates = { latitude: 5.5560, longitude: -0.1969 } // University of Ghana
      
      const distance = calculateDistance(point1, point2)
      
      // Distance should be approximately 5.5km (5500m)
      expect(distance).toBeGreaterThan(5000)
      expect(distance).toBeLessThan(6000)
    })

    it('should handle multiple rapid calculations efficiently', () => {
      const testPoints: Coordinates[] = [
        { latitude: 5.6037, longitude: -0.1870 },
        { latitude: 5.6040, longitude: -0.1875 },
        { latitude: 5.6035, longitude: -0.1865 },
        { latitude: 5.6030, longitude: -0.1880 },
        { latitude: 5.6045, longitude: -0.1860 }
      ]

      const startTime = Date.now()
      
      testPoints.forEach(point => {
        const result = verifyLocationForAttendance(point)
        expect(typeof result.verified).toBe('boolean')
        expect(typeof result.distance).toBe('number')
      })
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Should complete all calculations in reasonable time (< 100ms)
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('Error Handling and Robustness', () => {
    it('should handle extreme coordinate values gracefully', () => {
      const extremePoints: Coordinates[] = [
        { latitude: 89.9999, longitude: 179.9999 }, // Near North Pole
        { latitude: -89.9999, longitude: -179.9999 }, // Near South Pole
        { latitude: 0, longitude: 0 }, // Equator/Prime Meridian
        { latitude: 0, longitude: 180 }, // International Date Line
        { latitude: 0, longitude: -180 } // International Date Line (other side)
      ]

      extremePoints.forEach(point => {
        expect(isValidCoordinates(point)).toBe(true)
        
        const result = verifyLocationForAttendance(point)
        expect(typeof result.verified).toBe('boolean')
        expect(typeof result.distance).toBe('number')
        expect(result.distance).toBeGreaterThanOrEqual(0)
        
        // All these points should be very far from UPSA
        expect(result.verified).toBe(false)
        expect(result.distance).toBeGreaterThan(1000)
      })
    })

    it('should maintain consistency across multiple calls', () => {
      const testPoint: Coordinates = { latitude: 5.6040, longitude: -0.1875 }
      
      // Call the same function multiple times
      const results = Array.from({ length: 10 }, () => 
        verifyLocationForAttendance(testPoint)
      )
      
      // All results should be identical
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.verified).toBe(firstResult.verified)
        expect(result.distance).toBe(firstResult.distance)
        expect(result.withinRadius).toBe(firstResult.withinRadius)
      })
    })
  })
})