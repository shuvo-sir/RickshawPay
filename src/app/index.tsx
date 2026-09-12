import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapViewDirections from 'react-native-maps-directions';

// ⚠️ IMPORTANT: You will need a real Google Maps API Key here eventually!
const GOOGLE_MAPS_API_KEY = 'AIzaSyA2IeniVh52jYHC1RlpM5Isze89aqUIIMg'; 

export default function App() {
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);
  
  const mapRef = useRef(null);

  // Our Rickshaw Fare Algorithm
  const calculateFare = (distInKm) => {
    const baseFare = 20; // 20 Tk fixed starting rate
    const perKmRate = 15; // 15 Tk per Kilometer
    const total = baseFare + (distInKm * perKmRate);
    setFare(Math.round(total));
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      
      {/* --- SEARCH BAR AT THE TOP --- */}
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Where are you going?"
          fetchDetails={true}
          onPress={(data, details = null) => {
            // When user taps a place, save its coordinates
            setDestination({
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
            });
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            components: 'country:bd', // Limits search to Bangladesh
          }}
          styles={{
            container: { flex: 0 },
            textInput: styles.searchInput,
          }}
        />
      </View>

      {/* --- MAP SECTION --- */}
      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : !location ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Finding your location...</Text>
        </View>
      ) : (
        <>
          <MapView 
            ref={mapRef}
            style={styles.map} 
            initialRegion={location}
            showsUserLocation={true}
          >
            {/* Pickup Marker */}
            <Marker coordinate={location} title="Pickup" />

            {/* Dropoff Marker (Only shows after searching) */}
            {destination && (
              <Marker coordinate={destination} pinColor="green" title="Dropoff" />
            )}

            {/* Route Polyline (Draws line and calculates distance) */}
            {location && destination && (
              <MapViewDirections
                origin={location}
                destination={destination}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={4}
                strokeColor="#2b6cb0"
                mode="DRIVING" // "WALKING" or "BICYCLING" are also good for rickshaws
                onReady={(result) => {
                  setDistance(result.distance); // Distance in kilometers
                  calculateFare(result.distance);
                  
                  // Zoom map out so both pins fit nicely on screen
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 150, right: 50, bottom: 200, left: 50 },
                  });
                }}
              />
            )}
          </MapView>

          {/* --- FARE CALCULATOR UI --- */}
          {destination && (
            <View style={styles.fareContainer}>
              <Text style={styles.distanceText}>Distance: {distance.toFixed(1)} km</Text>
              <Text style={styles.farePrice}>Estimated Fare: ৳{fare}</Text>
              <View style={styles.button}>
                <Text style={styles.buttonText}>Confirm Ride</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'absolute', // Allows search bar to float over the map
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchContainer: {
    position: 'absolute',
    top: 50, // Space for phone status bar
    width: '90%',
    alignSelf: 'center',
    zIndex: 1, // Keeps search bar above the map
  },
  searchInput: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  fareContainer: {
    position: 'absolute',
    bottom: 40,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  farePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 50,
    color: 'red',
    fontSize: 16,
  }
});