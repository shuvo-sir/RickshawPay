/* eslint-disable react-hooks/refs */
import { Slot } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setIsAppReady(true));
  }, [fadeAnim, slideAnim]);

  if (!isAppReady) {
    return (
      <View style={styles.splash}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <Image
            source={require('../../assets/images/rickshaw.png')}
            style={{ width: 150, height: 150, resizeMode: 'contain' }}
          />
        </Animated.View>
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
