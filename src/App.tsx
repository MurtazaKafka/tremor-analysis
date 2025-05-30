import React, { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TremorData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  time: number;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [tremorData, setTremorData] = useState<TremorData[]>([]);
  const [dominantFrequency, setDominantFrequency] = useState<number>(0);
  const [averageAmplitude, setAverageAmplitude] = useState<number>(0);
  const [forceUpdate, setForceUpdate] = useState(0); // For forcing chart re-renders
  const [debugInfo, setDebugInfo] = useState<string>('App loaded');
  const [testCounter, setTestCounter] = useState(0); // Simple test counter
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Debug logging
  console.log('🔍 App render - isRecording:', isRecording, 'tremorData.length:', tremorData.length, 'debugInfo:', debugInfo, 'testCounter:', testCounter);

  // Force chart updates during recording for smooth animation
  useEffect(() => {
    console.log('🔍 useEffect triggered - isRecording:', isRecording);
    let updateInterval: NodeJS.Timeout;
    if (isRecording) {
      console.log('🔍 Setting up update interval for recording');
      updateInterval = setInterval(() => {
        setForceUpdate(prev => {
          console.log('🔍 Force update:', prev + 1);
          return prev + 1;
        });
      }, 100); // Update every 100ms for smooth animation
    }
    
    return () => {
      if (updateInterval) {
        console.log('🔍 Cleaning up update interval');
        clearInterval(updateInterval);
      }
    };
  }, [isRecording]);

  // Simple FFT approximation - find dominant frequency
  const analyzeFrequency = (data: TremorData[]) => {
    if (data.length < 10) return;

    const magnitudes = data.map(d => d.magnitude);
    const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    setAverageAmplitude(Number(avgMagnitude.toFixed(3)));

    // Simple frequency analysis - count oscillations
    let peaks = 0;
    for (let i = 1; i < magnitudes.length - 1; i++) {
      if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
        peaks++;
      }
    }
    
    const duration = (data[data.length - 1].time - data[0].time) / 1000; // seconds
    const frequency = peaks / duration;
    setDominantFrequency(Number(frequency.toFixed(2)));
  };

  const startRecording = async () => {
    console.log('🔍 startRecording called');
    setDebugInfo('Starting recording...');
    
    try {
      // Request permission for iOS devices
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        console.log('🔍 Requesting iOS motion permission');
        setDebugInfo('Requesting iOS permission...');
        const permission = await (DeviceMotionEvent as any).requestPermission();
        console.log('🔍 iOS permission result:', permission);
        if (permission !== 'granted') {
          alert('Motion permission denied');
          setDebugInfo('Permission denied');
          return;
        }
      }

      console.log('🔍 Setting isRecording to true');
      setIsRecording(true);
      setDebugInfo('Recording started!');
      setTremorData([]);
      setDominantFrequency(0);
      setAverageAmplitude(0);
      startTimeRef.current = Date.now();

      const handleMotion = (event: DeviceMotionEvent) => {
        console.log('🔍 Motion event received:', event.accelerationIncludingGravity);
        if (!event.accelerationIncludingGravity) {
          console.log('🔍 No acceleration data available');
          return;
        }

        const { x, y, z } = event.accelerationIncludingGravity;
        if (x !== null && y !== null && z !== null) {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const time = Date.now() - startTimeRef.current;
          console.log('🔍 Adding data point:', { x, y, z, magnitude, time });

          setTremorData(prev => {
            const newData = [...prev, { x, y, z, magnitude, time }];
            const result = newData.slice(-300);
            console.log('🔍 Updated tremorData length:', result.length);
            return result;
          });
          
          setDebugInfo(`Recording: ${time}ms`);
        } else {
          console.log('🔍 Null acceleration values:', { x, y, z });
        }
      };

      console.log('🔍 Adding devicemotion event listener');
      setDebugInfo('Event listener added');
      window.addEventListener('devicemotion', handleMotion);

      // Test if DeviceMotionEvent is working by checking for any motion
      const testMotion = () => {
        console.log('🔍 Testing motion detection...');
        setDebugInfo('Testing motion...');
        
        // Check if we can create a test event
        if (typeof DeviceMotionEvent !== 'undefined') {
          console.log('🔍 DeviceMotionEvent constructor exists');
        } else {
          console.log('🔍 DeviceMotionEvent constructor does NOT exist');
        }
        
        // Add a fallback test event
        const testEvent = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 1, y: 2, z: 9.8 }
        });
        console.log('🔍 Created test event:', testEvent);
      };
      
      // Run test after a short delay
      setTimeout(testMotion, 1000);

      // Auto-stop after 10 seconds
      console.log('🔍 Setting 10-second auto-stop timer');
      intervalRef.current = setTimeout(() => {
        console.log('🔍 Auto-stop timer triggered');
        stopRecording();
      }, 10000);

      // Store the event listener for cleanup
      (window as any).currentMotionHandler = handleMotion;

      // If we're on desktop, simulate motion events for testing
      const isDesktop = !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      if (isDesktop) {
        console.log('🔍 Desktop detected - starting motion simulation');
        setDebugInfo('Desktop mode - simulating motion');
        
        let simCounter = 0;
        const simulateMotion = () => {
          // Check if still recording by looking at the current state
          if (simCounter >= 100) return;
          
          simCounter++;
          const time = simCounter * 100;
          const fakeEvent = {
            accelerationIncludingGravity: {
              x: Math.sin(time / 1000) * 2 + (Math.random() - 0.5) * 0.5,
              y: Math.cos(time / 1000) * 1.5 + (Math.random() - 0.5) * 0.5,
              z: 9.8 + Math.sin(time / 500) * 1 + (Math.random() - 0.5) * 0.3
            }
          } as DeviceMotionEvent;
          
          console.log('🔍 Simulated motion event:', fakeEvent.accelerationIncludingGravity);
          handleMotion(fakeEvent);
          
          setTimeout(simulateMotion, 100);
        };
        
        setTimeout(simulateMotion, 500);
      }

    } catch (error) {
      console.error('🔍 Error in startRecording:', error);
      alert('Error accessing motion sensors: ' + error);
      setIsRecording(false);
      setDebugInfo('Error: ' + error);
    }
  };

  const stopRecording = () => {
    console.log('🔍 stopRecording called');
    setIsRecording(false);
    setDebugInfo('Recording stopped');
    
    if (intervalRef.current) {
      console.log('🔍 Clearing auto-stop timer');
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    if ((window as any).currentMotionHandler) {
      console.log('🔍 Removing devicemotion event listener');
      window.removeEventListener('devicemotion', (window as any).currentMotionHandler);
      (window as any).currentMotionHandler = null;
    }

    // Analyze the collected data after a short delay to ensure state is updated
    setTimeout(() => {
      console.log('🔍 Analyzing collected data');
      setTremorData(currentData => {
        console.log('🔍 Data to analyze:', currentData.length, 'points');
        if (currentData.length > 0) {
          analyzeFrequency(currentData);
        }
        return currentData;
      });
    }, 100);
  };

  // Simple test data simulation for demonstration
  const simulateTestData = () => {
    console.log('🔍 simulateTestData called');
    setIsRecording(true);
    setDebugInfo('Generating test data...');
    setTremorData([]);
    setDominantFrequency(0);
    setAverageAmplitude(0);
    
    const testData: TremorData[] = [];
    
    // Simulate tremor data with a dominant frequency around 5 Hz
    for (let i = 0; i < 100; i++) {
      const time = i * 100; // 100ms intervals
      const tremor = Math.sin(2 * Math.PI * 5 * time / 1000) * 2; // 5 Hz tremor
      const noise = (Math.random() - 0.5) * 0.5; // Add some noise
      const magnitude = 9.8 + tremor + noise; // Earth gravity + tremor + noise
      
      testData.push({
        x: magnitude * 0.3,
        y: magnitude * 0.4,
        z: magnitude * 0.5,
        magnitude,
        time
      });
    }
    
    console.log('🔍 Generated test data:', testData.length, 'points');
    setTremorData(testData);
    setIsRecording(false);
    setDebugInfo('Test data generated');
    
    // Analyze the test data
    setTimeout(() => {
      console.log('🔍 Analyzing test data');
      analyzeFrequency(testData);
    }, 100);
  };

  // Chart data
  const chartData = {
    labels: tremorData.map(d => (d.time / 1000).toFixed(1)), // Show time in seconds
    datasets: [
      {
        label: 'Tremor Magnitude (m/s²)',
        data: tremorData.map(d => d.magnitude),
        borderColor: isRecording ? 'rgb(220, 53, 69)' : 'rgb(75, 192, 192)', // Red during recording
        backgroundColor: isRecording ? 'rgba(220, 53, 69, 0.1)' : 'rgba(75, 192, 192, 0.2)',
        tension: 0.2, // Smooth curves
        pointRadius: isRecording ? 1 : 2,
        pointBackgroundColor: isRecording ? 'rgb(220, 53, 69)' : 'rgb(75, 192, 192)',
        borderWidth: isRecording ? 3 : 2, // Thicker line during recording for visibility
        fill: false,
      },
    ],
  };

  console.log('🔍 Chart data generated - isRecording:', isRecording, 'borderColor:', isRecording ? 'rgb(220, 53, 69)' : 'rgb(75, 192, 192)');

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isRecording ? 200 : 750, // Fast, smooth animation during recording
      easing: 'linear' as const,
    },
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: isRecording ? '🔴 LIVE - Recording Tremor Data' : 'Hand Tremor Analysis Results',
        color: isRecording ? '#dc3545' : '#333',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (seconds)',
        },
        type: 'linear' as const,
        position: 'bottom' as const,
        // Auto-scroll during recording to show latest data
        min: isRecording && tremorData.length > 50 ? 
          Math.max(0, tremorData[tremorData.length - 1]?.time / 1000 - 8) : undefined,
        max: isRecording && tremorData.length > 50 ? 
          (tremorData[tremorData.length - 1]?.time / 1000 + 1) : undefined,
      },
      y: {
        title: {
          display: true,
          text: 'Acceleration (m/s²)',
        },
        min: 5, // Set reasonable bounds for acceleration data
        max: 15,
      },
    },
    elements: {
      point: {
        radius: isRecording ? 1 : 2, // Small points during recording for smooth animation
      },
      line: {
        tension: 0.2, // Smoother curves for better animation
      },
    },
  };

  console.log('🔍 Chart options generated - title will be:', isRecording ? '🔴 LIVE - Recording Tremor Data' : 'Hand Tremor Analysis Results');
  console.log('🔍 Chart animation duration:', isRecording ? 200 : 750);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔬 Simple Tremor Analyzer</h1>
        <p>Hold your phone steady and click record to analyze hand tremors</p>
        
        <div style={{ margin: '20px 0' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: isRecording ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎯 Start Recording'}
          </button>
          
          <button
            onClick={simulateTestData}
            disabled={isRecording}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: isRecording ? 0.5 : 1,
              marginRight: '10px',
            }}
          >
            🧪 Test with Sample Data
          </button>

          <button
            onClick={() => {
              console.log('🔍 Manual data injection');
              const newPoint = {
                x: Math.random() * 2,
                y: Math.random() * 2,
                z: 9.8 + Math.random(),
                magnitude: 9.8 + Math.random(),
                time: Date.now() - (startTimeRef.current || Date.now())
              };
              setTremorData(prev => {
                const newData = [...prev, newPoint];
                console.log('🔍 Manual data - new length:', newData.length);
                return newData;
              });
              setDebugInfo(`Manual data added`);
              console.log('🔍 Added manual data point:', newPoint);
            }}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            ➕ Add Manual Data
          </button>

          <button
            onClick={() => {
              console.log('🔍 Counter test - current:', testCounter);
              setTestCounter(prev => prev + 1);
            }}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            🔢 Test Counter: {testCounter}
          </button>

          <button
            onClick={() => {
              console.log('🔍 Direct toggle - current isRecording:', isRecording);
              setIsRecording(!isRecording);
              setDebugInfo(`Direct toggle to: ${!isRecording}`);
            }}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🔧 Debug Toggle
          </button>
        </div>

        {/* DEBUG PANEL */}
        <div style={{
          backgroundColor: '#e9ecef',
          padding: '10px',
          borderRadius: '5px',
          margin: '10px 0',
          fontSize: '12px',
          fontFamily: 'monospace',
          textAlign: 'left'
        }}>
          <strong>🔍 DEBUG INFO:</strong><br/>
          testCounter: <span style={{color: 'cyan'}}>{testCounter}</span><br/>
          isRecording: <span style={{color: isRecording ? 'red' : 'green'}}>{String(isRecording)}</span><br/>
          tremorData.length: <span style={{color: 'blue'}}>{tremorData.length}</span><br/>
          forceUpdate: <span style={{color: 'purple'}}>{forceUpdate}</span><br/>
          debugInfo: <span style={{color: 'orange'}}>{debugInfo}</span><br/>
          UserAgent: <span style={{color: 'gray', fontSize: '10px'}}>{navigator.userAgent.substring(0, 50)}...</span><br/>
          isMobile: <span style={{color: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'green' : 'red'}}>{String(/Mobile|Android|iPhone|iPad/.test(navigator.userAgent))}</span><br/>
          DeviceMotionEvent available: <span style={{color: typeof DeviceMotionEvent !== 'undefined' ? 'green' : 'red'}}>{String(typeof DeviceMotionEvent !== 'undefined')}</span><br/>
          Permission function available: <span style={{color: typeof (DeviceMotionEvent as any)?.requestPermission === 'function' ? 'green' : 'red'}}>{String(typeof (DeviceMotionEvent as any)?.requestPermission === 'function')}</span>
        </div>

        {isRecording && (
          <div style={{ color: '#ff6b6b', fontSize: '16px', margin: '10px 0' }}>
            🔴 Recording... (10 seconds max)
          </div>
        )}

        {tremorData.length > 0 && (
          <div style={{ margin: '20px 0', textAlign: 'left' }}>
            <h3>📊 Results:</h3>
            <p>🎯 Dominant Frequency: <strong>{dominantFrequency} Hz</strong></p>
            <p>📈 Average Amplitude: <strong>{averageAmplitude} m/s²</strong></p>
            <p>📋 Data Points: <strong>{tremorData.length}</strong></p>
            
            {dominantFrequency > 0 && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                <strong>Analysis:</strong>
                {dominantFrequency >= 4 && dominantFrequency <= 6 ? (
                  <p style={{ color: '#dc3545' }}>⚠️ Frequency range suggests possible Parkinson's tremor (4-6 Hz)</p>
                ) : dominantFrequency >= 6 && dominantFrequency <= 12 ? (
                  <p style={{ color: '#fd7e14' }}>⚠️ Frequency range suggests possible Essential tremor (6-12 Hz)</p>
                ) : (
                  <p style={{ color: '#28a745' }}>✅ Frequency appears normal</p>
                )}
              </div>
            )}
          </div>
        )}

        {tremorData.length > 0 && (
          <div style={{ 
            width: '100%', 
            maxWidth: '700px', 
            margin: '20px 0',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            border: isRecording ? '2px solid #dc3545' : '1px solid #ddd',
            transition: 'border-color 0.3s ease'
          }} 
          className={isRecording ? 'live-chart-container' : ''}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              color: isRecording ? '#dc3545' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {isRecording ? '🔴 Live Recording' : '📈 Tremor Analysis'} 
              {isRecording && (
                <span style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '10px'
                }} 
                className="recording-indicator">
                  LIVE
                </span>
              )}
            </h3>
            <div style={{ height: '400px', position: 'relative' }}>
              <Line data={chartData} options={chartOptions} key={forceUpdate} />
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(220, 53, 69, 0.9)',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ● {tremorData.length} points
                </div>
              )}
            </div>
          </div>
        )}

        {isRecording && tremorData.length > 0 && (
          <div style={{ margin: '10px 0', fontSize: '14px', color: '#007bff' }}>
            📊 Data points collected: <strong>{tremorData.length}</strong>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
