import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions, TextInput, FlatList, TouchableOpacity, Keyboard, Switch, Alert, Share, Modal } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// NEW: Import Async Storage
import AsyncStorage from '@react-native-async-storage/async-storage';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type SearchFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
  };
};

type RouteResponse = {
  routes?: Array<{
    distance: number;
    geometry: { coordinates: Array<[number, number]> };
  }>;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Map'); 
  
  const [location, setLocation] = useState<Region | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [distance, setDistance] = useState(0);
  const [fare, setFare] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSurge, setIsSurge] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [actualFare, setActualFare] = useState('');
  
  const mapRef = useRef<MapView | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- NEW: SOS State ---
  const [sosContacts, setSosContacts] = useState(['', '', '']); // Array of 3 numbers
  
  // NEW: Load saved SOS numbers when app starts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const savedContacts = await AsyncStorage.getItem('@sos_contacts');
        if (savedContacts !== null) {
          setSosContacts(JSON.parse(savedContacts));
        }
      } catch (e) {
        console.error("Failed to load contacts", e);
      }
    };
    loadContacts();
  }, []);

  // NEW: Save SOS numbers to phone storage
  const saveContacts = async (newContacts: string[]) => {
    try {
      await AsyncStorage.setItem('@sos_contacts', JSON.stringify(newContacts));
      setSosContacts(newContacts);
      Alert.alert("Success", "Emergency contacts saved!");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Error", "Failed to save contacts.");
    }
  };

  const updateContact = (text: string, index: number) => {
    const newContacts = [...sosContacts];
    newContacts[index] = text;
    setSosContacts(newContacts);
  };

  // NEW: The massive red SOS Action
  const triggerSOS = async () => {
    if (!location) {
      Alert.alert("Error", "Cannot find your location for SOS.");
      return;
    }

    const validNumbers = sosContacts.filter(num => num.trim() !== '');
    if (validNumbers.length === 0) {
      Alert.alert("No Contacts", "Please add emergency contacts in the Profile tab first.");
      setActiveTab('Profile');
      return;
    }

    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    const message = `🚨 EMERGENCY (Rickshaw Ride): I feel unsafe. My live location is here: ${mapsLink}`;
    
    // We use Share because it can send directly to WhatsApp/Messenger groups too!
    try { 
      await Share.share({ message: message }); 
    } catch (error) { 
      console.error(error); 
    }
  };

  useEffect(() => {
    if (distance > 0) {
      const baseFare = 20; 
      const perKmRate = 15; 
      let total = baseFare + (distance * perKmRate);
      if (isSurge) total = total * 1.5; 
      setFare(Math.round(total));
    }
  }, [distance, isSurge]);

  useEffect(() => {
    let isMounted = true; 
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return; 
      if (status !== 'granted') {
        setErrorMsg('Permission denied');
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
    return () => { isMounted = false; };
  }, []);

  const shareLocation = async () => {
    if (!location) return;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    try { await Share.share({ message: `I'm in a rickshaw. My live location: ${mapsLink}` }); } 
    catch (error) { Alert.alert("Error", "Could not share."); }
  };

  const submitRealFare = (paidAmount: string | number) => {
    const numericFare = typeof paidAmount === 'number' ? paidAmount : Number(paidAmount);
    if (!paidAmount || Number.isNaN(numericFare)) {
      Alert.alert("Invalid Input", "Please enter a valid number.");
      return;
    }
    console.log(`Fare logged: Estimated ${fare}, Actual ${numericFare}`);
    Alert.alert("Thank You!", "Feedback saved! 🇧🇩");
    setIsModalVisible(false);
    setShowCustomInput(false);
    setActualFare('');
    setDestination(null);
    setSearchQuery('');
    setRouteCoords([]);
    setDistance(0);
    setIsSurge(false);
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 3) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(() => { executeSearch(text); }, 500);
  };

  const executeSearch = async (text: string) => {
    try {
      let url = `https://photon.komoot.io/api/?q=${text}&limit=5&bbox=90.31,23.66,90.52,23.90`;
      if (location) url += `&lat=${location.latitude}&lon=${location.longitude}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data: { features?: SearchFeature[] } = await response.json();
      setSearchResults(data.features || []); 
    } catch (error) { console.error(error); }
  };

  const fetchRoute = async (destLat: number, destLon: number) => {
    if (!location) return;
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/bike/${location.longitude},${location.latitude};${destLon},${destLat}?overview=full&geometries=geojson`);
      if (!response.ok) return;
      const data: RouteResponse = await response.json();
      if (data.routes && data.routes.length > 0) {
        setDistance(data.routes[0].distance / 1000); 
        const points = data.routes[0].geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 150, right: 50, bottom: 400, left: 50 } });
      }
    } catch (error) { console.error(error); }
  };

  const handlePlaceSelect = (item: SearchFeature) => {
    Keyboard.dismiss();
    const lon = item.geometry.coordinates[0];
    const lat = item.geometry.coordinates[1];
    setDestination({ latitude: lat, longitude: lon });
    setSearchQuery(item.properties.name || item.properties.street || "Selected Location"); 
    setSearchResults([]); 
    fetchRoute(lat, lon);
  };

  const renderScreen = () => {
    return (
      <View style={styles.screenContainer}>
        
        {/* --- MAP SCREEN --- */}
        <View style={{ flex: 1, display: activeTab === 'Map' ? 'flex' : 'none' }}>
          
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} placeholder="Where are you going?" value={searchQuery} onChangeText={handleSearchInput} />
            {searchResults.length > 0 && (
              <FlatList data={searchResults} keyExtractor={(item, index) => index.toString()} style={styles.resultsList} keyboardShouldPersistTaps="handled" renderItem={({ item }) => {
                  const addressParts = [item.properties.name, item.properties.street, item.properties.city].filter(Boolean); 
                  return (
                    <TouchableOpacity style={styles.resultItem} onPress={() => handlePlaceSelect(item)}>
                      <Text style={styles.resultText} numberOfLines={1}>{addressParts.join(', ')}</Text>
                    </TouchableOpacity>
                  )
                }}
              />
            )}
          </View>

          {/* NEW: The Floating Red SOS Button (Only visible during a ride) */}
          {destination && distance > 0 && (
            <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
              <Ionicons name="warning" size={24} color="white" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          )}

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : !location ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2b6cb0" />
            </View>
          ) : (
            <>
              <MapView ref={mapRef} style={styles.map} initialRegion={location} showsUserLocation={true}>
                <Marker coordinate={location} title="Pickup" />
                {destination && <Marker coordinate={destination} pinColor="green" title="Dropoff" />}
                {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#2b6cb0" />}
              </MapView>

              {destination && distance > 0 && (
                <View style={styles.fareContainer}>
                  <Text style={styles.distanceText}>Distance: {distance.toFixed(1)} km</Text>
                  
                  <View style={styles.surgeContainer}>
                    <Text style={styles.surgeText}>🌧️ Rain / Traffic</Text>
                    <Switch trackColor={{ false: "#d1d5db", true: "#93c5fd" }} thumbColor={isSurge ? "#2b6cb0" : "#f3f4f6"} onValueChange={() => setIsSurge(!isSurge)} value={isSurge} />
                  </View>

                  <Text style={styles.farePrice}>৳{fare}</Text>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={shareLocation}>
                      <Text style={styles.shareButtonText}>📍 Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={() => setIsModalVisible(true)}>
                      <Text style={styles.buttonText}>Complete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* --- HISTORY SCREEN --- */}
        {activeTab === 'History' && (
          <View style={styles.placeholderScreen}>
            <Ionicons name="time-outline" size={60} color="#ccc" />
            <Text style={styles.placeholderTitle}>Ride History</Text>
            <Text style={styles.placeholderText}>Your past rickshaw fares will appear here.</Text>
          </View>
        )}

        {/* --- PROFILE SCREEN (Now built out for SOS) --- */}
        {activeTab === 'Profile' && (
          <View style={styles.profileScreen}>
            <Text style={styles.profileTitle}>Safety Settings</Text>
            <Text style={styles.profileSubtitle}>Add up to 3 emergency contacts. Tapping the SOS button will instantly prepare a message with your live location.</Text>
            
            <View style={styles.contactForm}>
              <Text style={styles.inputLabel}>Contact 1</Text>
              <TextInput style={styles.contactInput} placeholder="e.g. 01700000000" keyboardType="phone-pad" value={sosContacts[0]} onChangeText={(text) => updateContact(text, 0)} />
              
              <Text style={styles.inputLabel}>Contact 2</Text>
              <TextInput style={styles.contactInput} placeholder="e.g. 01800000000" keyboardType="phone-pad" value={sosContacts[1]} onChangeText={(text) => updateContact(text, 1)} />
              
              <Text style={styles.inputLabel}>Contact 3</Text>
              <TextInput style={styles.contactInput} placeholder="e.g. 01900000000" keyboardType="phone-pad" value={sosContacts[2]} onChangeText={(text) => updateContact(text, 2)} />
              
              <TouchableOpacity style={styles.saveButton} onPress={() => saveContacts(sosContacts)}>
                <Text style={styles.saveButtonText}>Save Contacts</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <View style={styles.floatingTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Map')}>
          <Ionicons name={activeTab === 'Map' ? 'map' : 'map-outline'} size={24} color={activeTab === 'Map' ? '#2b6cb0' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'Map' && styles.tabTextActive]}>Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('History')}>
          <Ionicons name={activeTab === 'History' ? 'time' : 'time-outline'} size={24} color={activeTab === 'History' ? '#2b6cb0' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'History' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Profile')}>
          <Ionicons name={activeTab === 'Profile' ? 'person' : 'person-outline'} size={24} color={activeTab === 'Profile' ? '#2b6cb0' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'Profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => { setIsModalVisible(false); setShowCustomInput(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ride Completed 🏁</Text>
            {!showCustomInput ? (
              <>
                <Text style={styles.modalText}>Did you pay the estimated fare of ৳{fare}?</Text>
                <TouchableOpacity style={styles.modalButtonYes} onPress={() => submitRealFare(fare)}>
                  <Text style={styles.modalButtonYesText}>Yes, I paid ৳{fare}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonNo} onPress={() => setShowCustomInput(true)}>
                  <Text style={styles.modalButtonNoText}>No, I paid a different amount</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalText}>How much did you actually pay?</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="e.g. 60" value={actualFare} onChangeText={setActualFare} autoFocus={true} />
                <TouchableOpacity style={styles.modalButtonYes} onPress={() => submitRealFare(actualFare)}>
                  <Text style={styles.modalButtonYesText}>Submit Real Fare</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonNo} onPress={() => { setShowCustomInput(false); setActualFare(''); }}>
                  <Text style={styles.modalButtonNoText}>Go Back</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeModalButton} onPress={() => { setIsModalVisible(false); setShowCustomInput(false); }}>
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  screenContainer: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  searchContainer: { position: 'absolute', top: 50, width: '90%', alignSelf: 'center', zIndex: 1 },
  searchInput: { height: 50, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, fontSize: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  resultsList: { backgroundColor: 'white', marginTop: 5, borderRadius: 12, maxHeight: 200, elevation: 5 },
  resultItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultText: { fontSize: 14 },
  
  // NEW: SOS Button Styles
  sosButton: { position: 'absolute', top: 120, right: 20, backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 30, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 1 },
  sosText: { color: 'white', fontWeight: 'bold', marginLeft: 5, fontSize: 16 },

  fareContainer: { position: 'absolute', bottom: 100, width: '90%', alignSelf: 'center', backgroundColor: 'white', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, alignItems: 'center' },
  distanceText: { fontSize: 16, color: '#666', marginBottom: 10 },
  surgeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: '#f3f4f6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginBottom: 15 },
  surgeText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  farePrice: { fontSize: 32, fontWeight: 'bold', color: '#2b6cb0', marginBottom: 15 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
  button: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmButton: { backgroundColor: '#2b6cb0', flex: 2 },
  shareButton: { backgroundColor: '#e5e7eb', flex: 1 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  shareButtonText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
  
  floatingTabBar: { position: 'absolute', bottom: 20, width: '85%', alignSelf: 'center', backgroundColor: 'white', borderRadius: 30, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '500' },
  tabTextActive: { color: '#2b6cb0', fontWeight: 'bold' },
  
  // NEW: Profile & SOS Form Styles
  profileScreen: { flex: 1, backgroundColor: '#f9fafb', padding: 25, paddingTop: 60 },
  profileTitle: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  profileSubtitle: { fontSize: 15, color: '#6b7280', marginBottom: 30, lineHeight: 22 },
  contactForm: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 5 },
  contactInput: { height: 45, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
  saveButton: { backgroundColor: '#2b6cb0', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  placeholderScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 20 },
  placeholderTitle: { fontSize: 24, fontWeight: 'bold', color: '#374151', marginTop: 15, marginBottom: 10 },
  placeholderText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { flex: 1, textAlign: 'center', marginTop: 50, color: 'red', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#1f2937' },
  modalText: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 20 },
  modalButtonYes: { backgroundColor: '#2b6cb0', width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  modalButtonYesText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalButtonNo: { backgroundColor: '#f3f4f6', width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonNoText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
  modalInput: { width: '100%', height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 12, textAlign: 'center', fontSize: 20, marginBottom: 20, backgroundColor: '#f9fafb' },
  closeModalButton: { position: 'absolute', top: 15, right: 15, padding: 5 },
  closeModalText: { fontSize: 20, color: '#9ca3af', fontWeight: 'bold' }
});