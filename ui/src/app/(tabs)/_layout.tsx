import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BAR_WIDTH = Dimensions.get('window').width - 40;
const BAR_HEIGHT = 55;
const CORNER_RADIUS = 15;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Define your padding so the math knows about it
  const PADDING = 30; 

  // Subtract the left & right padding from the total width to get the inner space
  const INNER_WIDTH = BAR_WIDTH - (PADDING * 2); 

  // Calculate the center using the inner space, then ADD the left padding to push it over!
  const CX = PADDING + (((state.index + 0.5) * INNER_WIDTH) / state.routes.length);
  // Y coordinate of the top of the curve 38 and the curve is 38 units high, so the top of the curve is at Y = 0 
  // X coordinate of the left and right control points of the curve are 25 units away from the center, so the left control point is at X = CX - 25 and the right control point is at X = CX + 25 and the left and right end points of the curve are 50 units away from the center, so the left end point is at X = CX - 50 and the right end point is at X = CX + 50
  const svgPath = `
    M ${CORNER_RADIUS} 0
    L ${CX - 39} 0
    C ${CX - 25} 0, ${CX - 30} 32, ${CX} 32
    C ${CX + 30} 32, ${CX + 25} 0, ${CX + 39} 0
    L ${BAR_WIDTH - CORNER_RADIUS} 0
    A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${BAR_WIDTH} ${CORNER_RADIUS}
    L ${BAR_WIDTH} ${BAR_HEIGHT - CORNER_RADIUS}
    A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${BAR_WIDTH - CORNER_RADIUS} ${BAR_HEIGHT}
    L ${CORNER_RADIUS} ${BAR_HEIGHT}
    A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 0 ${BAR_HEIGHT - CORNER_RADIUS}
    L 0 ${CORNER_RADIUS}
    A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${CORNER_RADIUS} 0
    Z
  `;

  return (
    <View style={styles.tabBar}>
      <Svg
        width={BAR_WIDTH}
        height={BAR_HEIGHT}
        viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}
        style={styles.background}
      >
        <Path d={svgPath} fill="white" />
      </Svg>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        const isFocused = state.index === index;
        const color = isFocused ? '#b91048' : '#10b981'; 
        const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 24 });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
            accessibilityState={{ selected: isFocused }}
            testID={options.tabBarButtonTestID}
            style={styles.tabButton}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            }}
          >
            {isFocused ? (
              <View style={styles.activeIconContainer}>{icon}</View>
            ) : (
              icon
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ride',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meetup"
        options={{
          title: 'Meetup',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'warning' : 'warning-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    shadowColor: '#b91048',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    top: -24,
    width: 50,
    height: 50,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#f9fafb',
    shadowColor: '#b91048',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
  },
});