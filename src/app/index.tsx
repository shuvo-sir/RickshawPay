import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions, TextInput, FlatList, TouchableOpacity, Keyboard } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const mapRef = useRef(null);
  const searchTimeout = useRef(null);

  const calculateFare = (distInKm) => {
    const baseFare = 20; 
    const perKmRate = 15; 
    const total = baseFare + (distInKm * perKmRate);
    setFare(Math.round(total));
  };

  // --- FIX 1: The "isMounted" safety check to stop the React Error ---
  useEffect(() => {
    let isMounted = true; 

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (!isMounted) return; 

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      
      let currentLocation = await Location.getCurrentPositionAsync({});
      
      if (!isMounted) return; 

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();

    return () => {
      isMounted = false; // Cleans up if the component unmounts early
    };
  }, []);

  const handleSearchInput = (text) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      executeSearch(text);
    }, 500);
  };

  // --- FIX 2: Switching to Photon API (No 429 Rate Limits!) ---
  const executeSearch = async (text) => {
    try {
      // Photon is free, based on OSM, and designed for fast autocomplete!
      // We also pass your current lat/lon so it prioritizes places in Dhaka/Bangladesh.
      let url = `https://photon.komoot.io/api/?q=${text}&limit=5`;
      if (location) {
        url += `&lat=${location.latitude}&lon=${location.longitude}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) return;

      const data = await response.json();
      setSearchResults(data.features || []); 
    } catch (error) {
      console.error("Search failed safely:", error);
    }
  };

  const fetchRoute = async (destLat, destLon) => {
    if (!location) return;
    try {
      const startLon = location.longitude;
      const startLat = location.latitude;
      
      const response = await fetch(`https://router.project-osrm.org/route/v1/bike/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`);
      
      if (!response.ok) return;

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = route.distance / 1000;
        setDistance(distKm);
        calculateFare(distKm);

        const points = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoords(points);

        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 150, right: 50, bottom: 200, left: 50 },
        });
      }
    } catch (error) {
      console.error("Routing failed safely:", error);
    }
  };

  const handlePlaceSelect = (item) => {
    Keyboard.dismiss();
    
    // Photon stores coordinates differently than Nominatim
    const lon = item.geometry.coordinates[0];
    const lat = item.geometry.coordinates[1];
    
    setDestination({ latitude: lat, longitude: lon });
    
    // Grab the best short name for the search bar
    const shortName = item.properties.name || item.properties.street || "Selected Location";
    setSearchQuery(shortName); 
    
    setSearchResults([]); 
    fetchRoute(lat, lon);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          value={searchQuery}
          onChangeText={handleSearchInput}
        />
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => index.toString()}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled" // Allows tapping before keyboard closes
            renderItem={({ item }) => {
              // Combine name, street, and city nicely for the UI
              const addressParts = [
                item.properties.name,
                item.properties.street,
                item.properties.city,
                item.properties.state
              ].filter(Boolean); // removes empty values
              
              return (
                <TouchableOpacity style={styles.resultItem} onPress={() => handlePlaceSelect(item)}>
                  <Text style={styles.resultText} numberOfLines={1}>
                    {addressParts.join(', ')}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        )}
      </View>

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : !location ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b6cb0" />
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
            <Marker coordinate={location} title="Pickup" />
            
            {destination && (
              <Marker coordinate={destination} pinColor="green" title="Dropoff" />
            )}

            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={4}
                strokeColor="#2b6cb0"
              />
            )}
          </MapView>

          {destination && distance > 0 && (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  searchContainer: { position: 'absolute', top: 50, width: '90%', alignSelf: 'center', zIndex: 1 },
  searchInput: { height: 50, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, fontSize: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  resultsList: { backgroundColor: 'white', marginTop: 5, borderRadius: 8, maxHeight: 200, elevation: 5 },
  resultItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultText: { fontSize: 14 },
  fareContainer: { position: 'absolute', bottom: 40, width: '90%', alignSelf: 'center', backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, alignItems: 'center' },
  distanceText: { fontSize: 16, color: '#666', marginBottom: 5 },
  farePrice: { fontSize: 24, fontWeight: 'bold', color: '#2b6cb0', marginBottom: 15 },
  button: { backgroundColor: '#2b6cb0', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { flex: 1, textAlign: 'center', marginTop: 50, color: 'red', fontSize: 16 }
});