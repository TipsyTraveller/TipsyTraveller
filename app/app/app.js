import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

//SCREENS
import Home from '../home/home';
import SelectionPages from '../CreateGame/CreateGame';
import JoinGame from "../JoinGame/JoinGame"
import {useFonts} from "expo-font";
import Lobby from '../Lobby/Lobby';
import HostName from "../HostName/HostName";
import GameScreen from "../GameScreen/GameScreen";
import CharacterSelection from "../CharacterSelection/CharachterSelection";
import { DEV_GAME_ROUTE_PARAMS, START_ON_DEV_GAME_SCREEN } from "./devGameRoute";
import DevPortal from '../shared/dev/DevPortal';
import { navigationRef } from '../shared/dev/devNavigation';

const Stack = createStackNavigator();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    "dogicapixelbold": require("../../assets/fonts/dogicapixelbold.otf"),
    "dogicapixel": require("../../assets/fonts/dogicapixel.otf"),
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={START_ON_DEV_GAME_SCREEN ? "GameScreen" : "Home"}>
        <Stack.Screen
          name="Home"
          component={ Home }
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateGameScreen"
          component={ SelectionPages }
          options={{ headerShown: false }}
        />
        <Stack.Screen
            name="HostName"
            component={ HostName }
            options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JoinGameScreen"
          component={ JoinGame }
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name='LobbyScreen'
          component={ Lobby }
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name='GameScreen'
          component={ GameScreen }
          initialParams={START_ON_DEV_GAME_SCREEN ? DEV_GAME_ROUTE_PARAMS : undefined}
          options={{ headerShown: false }}

        />
        <Stack.Screen
          name='CharacterSelection'
          component={ CharacterSelection }
          options={{ headerShown: false }}
        />
        </Stack.Navigator>
      </NavigationContainer>
      <DevPortal />
    </SafeAreaProvider>
  );
}
