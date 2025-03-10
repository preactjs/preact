import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import WeatherDashboard from './WeatherDashboard';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <WeatherDashboard />
    </SafeAreaView>
  );
};

export default App;
