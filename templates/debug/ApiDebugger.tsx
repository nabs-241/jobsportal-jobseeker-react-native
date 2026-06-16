import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { buildApiUrl } from '../../config/api';
import { getUserId, getAuthToken, getUserData } from '../../utils/userHelper';

const ApiDebugger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => prev + info + '\n');
  };

  const clearDebugInfo = () => {
    setDebugInfo('');
  };

  const testApiConnection = async () => {
    setLoading(true);
    clearDebugInfo();
    
    try {
      addDebugInfo('=== API Debug Test ===');
      addDebugInfo('');

      // Test 1: Check stored data
      addDebugInfo('1. Checking stored data...');
      const userData = await getUserData();
      const token = await getAuthToken();
      const userId = await getUserId();
      
      addDebugInfo(`User Data: ${userData ? 'Found' : 'Not found'}`);
      addDebugInfo(`Token: ${token ? 'Found' : 'Not found'}`);
      addDebugInfo(`User ID: ${userId || 'Not found'}`);
      addDebugInfo('');

      if (userData) {
        addDebugInfo('User Data Details:');
        addDebugInfo(JSON.stringify(userData, null, 2));
        addDebugInfo('');
      }

      // Test 2: Check API URL
      addDebugInfo('2. Testing API URL...');
      const baseUrl = buildApiUrl('');
      const cvUrl = buildApiUrl(`/show-front-profile-cvs/${userId}`);
      addDebugInfo(`Base URL: ${baseUrl}`);
      addDebugInfo(`CV URL: ${cvUrl}`);
      addDebugInfo('');

      // Test 3: Test API call
      if (token && userId) {
        addDebugInfo('3. Testing API call...');
        
        const response = await fetch(cvUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        addDebugInfo(`Response Status: ${response.status}`);
        addDebugInfo(`Response OK: ${response.ok}`);
        addDebugInfo('');

        const responseText = await response.text();
        addDebugInfo('Response Headers:');
        response.headers.forEach((value, key) => {
          addDebugInfo(`  ${key}: ${value}`);
        });
        addDebugInfo('');

        addDebugInfo('Response Body:');
        addDebugInfo(responseText.substring(0, 1000));
        if (responseText.length > 1000) {
          addDebugInfo('... (truncated)');
        }
        addDebugInfo('');

        // Try to parse JSON
        try {
          const jsonData = JSON.parse(responseText);
          addDebugInfo('Parsed JSON:');
          addDebugInfo(JSON.stringify(jsonData, null, 2));
        } catch (parseError) {
          addDebugInfo('JSON Parse Error:');
          addDebugInfo(parseError.toString());
        }
      } else {
        addDebugInfo('❌ Cannot test API - missing token or user ID');
      }

      // Test 4: Test debug endpoint
      if (token) {
        addDebugInfo('');
        addDebugInfo('4. Testing debug endpoint...');
        
        const debugUrl = buildApiUrl('/debug-cv-tables');
        const debugResponse = await fetch(debugUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        addDebugInfo(`Debug Response Status: ${debugResponse.status}`);
        
        if (debugResponse.ok) {
          const debugText = await debugResponse.text();
          addDebugInfo('Debug Response:');
          addDebugInfo(debugText.substring(0, 2000));
          if (debugText.length > 2000) {
            addDebugInfo('... (truncated)');
          }
        } else {
          const errorText = await debugResponse.text();
          addDebugInfo('Debug Error Response:');
          addDebugInfo(errorText);
        }
      } else {
        addDebugInfo('❌ Cannot test API - missing token or user ID');
      }

    } catch (error) {
      addDebugInfo('❌ Error during test:');
      addDebugInfo(error.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>API Debugger</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={testApiConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test API Connection'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={clearDebugInfo}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.debugOutput}>
        <Text style={styles.debugText}>{debugInfo || 'Click "Test API Connection" to start debugging...'}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  controls: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  debugOutput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
});

export default ApiDebugger;
