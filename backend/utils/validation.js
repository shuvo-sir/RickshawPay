function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function isValidMeetupCode(code) {
  return typeof code === 'string' && /^[a-f0-9]{32}$/.test(code);
}

function isValidRidePayload(payload) {
  const coordinatesAreValid = isValidCoordinate(payload.startLat, payload.startLon)
    && isValidCoordinate(payload.endLat, payload.endLon);
  const faresAreValid = Number.isFinite(payload.estimatedFare)
    && payload.estimatedFare >= 0
    && Number.isFinite(payload.actualFarePaid)
    && payload.actualFarePaid >= 0;
  return coordinatesAreValid
    && Number.isFinite(payload.distanceKm)
    && payload.distanceKm > 0
    && faresAreValid;
}

module.exports = { isValidCoordinate, isValidMeetupCode, isValidRidePayload };