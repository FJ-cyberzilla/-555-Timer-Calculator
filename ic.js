import React, { useState, useEffect } from 'react';
import { Calculator, Zap, Info, X, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const IC555Calculator = () => {
  const [selectedPin, setSelectedPin] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [calculation, setCalculation] = useState(null);
  const [lcdText, setLcdText] = useState('');
  const [cursorBlink, setCursorBlink] = useState(true);

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => setCursorBlink(prev => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  // Standard capacitor values (E12 series)
  const standardCaps = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2, 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000, 2200, 3300, 4700, 10000];

  // Standard resistor values (E24 series)
  const standardResistors = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91, 100, 110, 120, 130, 150, 160, 180, 200, 220, 240, 270, 300, 330, 360, 390, 430, 470, 510, 560, 620, 680, 750, 820, 910, 1000];

  const findClosestValue = (target, array) => {
    return array.reduce((prev, curr) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
  };

  const selectTransistor = (loadCurrentMa, voltage) => {
    if (loadCurrentMa > 1500) {
      return {
        name: "IRFZ44N",
        type: "N-Channel MOSFET",
        specs: "55V, 49A, RDS(on)=17.5mΩ",
        baseR: "10kΩ gate resistor",
        powerRating: "94W",
        warning: voltage > 50 ? "⚠️ Voltage near transistor limit!" : null
      };
    } else if (loadCurrentMa > 800) {
      return {
        name: "D13007",
        type: "NPN Power Transistor",
        specs: "400V, 8A, hFE≈40",
        baseR: `${Math.round((voltage - 0.7) / (loadCurrentMa / 40 / 1000) / 100) * 100}Ω`,
        powerRating: "80W",
        warning: null
      };
    } else if (loadCurrentMa > 500) {
      return {
        name: "TIP41C",
        type: "NPN Power Transistor",
        specs: "100V, 6A, hFE≈50",
        baseR: `${Math.round((voltage - 0.7) / (loadCurrentMa / 50 / 1000) / 100) * 100}Ω`,
        powerRating: "65W",
        warning: null
      };
    } else if (loadCurrentMa > 150) {
      return {
        name: "2N3055",
        type: "NPN Power Transistor",
        specs: "60V, 15A, hFE≈50",
        baseR: `${Math.round((voltage - 0.7) / (loadCurrentMa / 50 / 1000) / 10) * 10}Ω`,
        powerRating: "115W",
        warning: null
      };
    } else if (loadCurrentMa > 100) {
      return {
        name: "BC337",
        type: "NPN Transistor",
        specs: "45V, 800mA, hFE≈250",
        baseR: `${Math.round((voltage - 0.7) / (loadCurrentMa / 250 / 1000))}Ω`,
        powerRating: "625mW",
        warning: null
      };
    } else {
      return {
        name: "BC548",
        type: "NPN Transistor",
        specs: "30V, 100mA, hFE≈300",
        baseR: "4.7kΩ",
        powerRating: "500mW",
        warning: loadCurrentMa > 80 ? "⚠️ Near current limit!" : null
      };
    }
  };

  const calculateComponents = (delay, voltage, loadCurrent) => {
    // Input validation
    const errors = [];
    const warnings = [];

    if (delay <= 0 || delay > 10000) errors.push("Delay must be between 0 and 10000 seconds");
    if (voltage < 4.5 || voltage > 16) warnings.push("555 optimal range: 4.5V-16V");
    if (loadCurrent < 1) errors.push("Load current must be positive");
    if (loadCurrent > 5000) warnings.push("Consider using a MOSFET driver circuit");

    if (errors.length > 0) {
      return { errors, warnings: [], valid: false };
    }

    // Calculate timing components
    // For monostable: T = 1.1 * R * C
    const targetRC = delay / 1.1;
    
    // Try to find optimal R and C combination
    let bestR = 10000; // Start with 10kΩ
    let bestC = (targetRC / bestR) * 1e6; // Convert to µF
    
    // Optimize for standard values
    if (bestC < 0.01) {
      bestR = 1000000; // 1MΩ
      bestC = (targetRC / bestR) * 1e6;
    } else if (bestC > 10000) {
      bestR = 1000; // 1kΩ
      bestC = (targetRC / bestR) * 1e6;
    }

    // Find closest standard values
    const closestR = findClosestValue(bestR, standardResistors.map(v => v * 1000));
    const actualC = (targetRC / closestR) * 1e6;
    const closestC = findClosestValue(actualC, standardCaps);
    
    // Recalculate actual delay with standard components
    const actualDelay = 1.1 * closestR * (closestC / 1e6);
    const delayError = ((actualDelay - delay) / delay) * 100;

    // Select transistor
    const transistor = selectTransistor(loadCurrent, voltage);

    // Calculate power dissipation
    const powerDissipation = (voltage * loadCurrent) / 1000; // Watts

    // AI Suggestions
    const suggestions = [];
    
    if (Math.abs(delayError) > 10) {
      suggestions.push({
        type: "warning",
        text: `Delay error: ${delayError.toFixed(1)}%. Consider using a trimmer potentiometer for fine adjustment.`
      });
    }

    if (closestC > 1000) {
      suggestions.push({
        type: "info",
        text: "Large capacitor needed. Use electrolytic type with proper polarity."
      });
    }

    if (closestR > 1000000) {
      suggestions.push({
        type: "warning",
        text: "Very high resistance. Use metal film resistor for stability."
      });
    }

    if (delay > 60) {
      suggestions.push({
        type: "info",
        text: "Long delay. Consider astable mode with counter IC for better accuracy."
      });
    }

    if (voltage < 6) {
      suggestions.push({
        type: "warning",
        text: "Low voltage. Ensure relay coil is rated for this voltage."
      });
    }

    if (powerDissipation > 1) {
      suggestions.push({
        type: "warning",
        text: `High power dissipation (${powerDissipation.toFixed(1)}W). Ensure adequate heatsinking.`
      });
    }

    suggestions.push({
      type: "success",
      text: `Selected ${transistor.name} can safely handle ${loadCurrent}mA at ${voltage}V.`
    });

    return {
      valid: true,
      errors: [],
      warnings,
      resistor: closestR,
      capacitor: closestC,
      actualDelay: actualDelay.toFixed(3),
      delayError: delayError.toFixed(2),
      transistor,
      powerDissipation: powerDissipation.toFixed(2),
      suggestions,
      voltage,
      loadCurrent
    };
  };

  const pinConfigs = {
    1: {
      name: "GND",
      title: "Ground",
      desc: "Connect to negative supply",
      color: "bg-slate-700"
    },
    2: {
      name: "TRIG",
      title: "Trigger Input",
      desc: "Monostable Mode Calculator",
      color: "bg-blue-600",
      hasCalculator: true
    },
    3: {
      name: "OUT",
      title: "Output",
      desc: "Transistor Driver Design",
      color: "bg-green-600",
      hasCalculator: true
    },
    4: {
      name: "RST",
      title: "Reset",
      desc: "Active low reset - tie to VCC",
      color: "bg-red-600"
    },
    5: {
      name: "CV",
      title: "Control Voltage",
      desc: "2/3 VCC reference - use 0.01µF cap",
      color: "bg-yellow-600"
    },
    6: {
      name: "THR",
      title: "Threshold",
      desc: "Timing threshold comparator",
      color: "bg-purple-600"
    },
    7: {
      name: "DIS",
      title: "Discharge",
      desc: "Timing capacitor discharge",
      color: "bg-orange-600"
    },
    8: {
      name: "VCC",
      title: "Power Supply",
      desc: "4.5V to 16V recommended",
      color: "bg-red-500"
    }
  };

  const handlePinClick = (pinNum) => {
    setSelectedPin(pinNum);
    setLcdText('');
    setCalculation(null);
    
    if (pinConfigs[pinNum].hasCalculator) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 500);
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const delay = parseFloat(formData.get('delay'));
    const voltage = parseFloat(formData.get('voltage'));
    const current = parseFloat(formData.get('current'));

    setAnimating(true);
    
    // Simulate calculation with typing effect
    const result = calculateComponents(delay, voltage, current);
    
    setTimeout(() => {
      setCalculation(result);
      setAnimating(false);
      
      // LCD typing effect
      if (result.valid) {
        const text = `R=${(result.resistor/1000).toFixed(1)}kΩ C=${result.capacitor}µF T=${result.actualDelay}s`;
        let i = 0;
        const typeInterval = setInterval(() => {
          if (i < text.length) {
            setLcdText(text.substring(0, i + 1));
            i++;
          } else {
            clearInterval(typeInterval);
          }
        }, 50);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-lg border border-blue-500/30">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
              555 Timer IC Calculator
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">Interactive Pin-by-Pin Design Tool</p>
          </div>
          <button
            onClick={() => setShowAbout(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base"
          >
            <Info size={18} />
            About
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* IC Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-4 sm:p-8 rounded-lg border border-blue-500/30">
          <h2 className="text-lg sm:text-xl font-bold text-blue-400 mb-4 sm:mb-6 flex items-center gap-2">
            <Zap size={20} />
            NE555 / LM555 IC
          </h2>
          
          <div className="relative">
            {/* IC Body */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg p-4 sm:p-8 border-4 border-slate-700 shadow-2xl">
              {/* IC Label */}
              <div className="text-center mb-4 sm:mb-8">
                <div className="inline-block bg-slate-950 px-3 sm:px-6 py-2 sm:py-3 rounded border border-slate-600">
                  <p className="text-slate-400 text-xs sm:text-sm font-mono">NE555N</p>
                  <p className="text-slate-500 text-[10px] sm:text-xs font-mono">TIMER IC</p>
                </div>
              </div>

              {/* Notch indicator */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-3 sm:h-4 bg-slate-950 rounded-b-full border-2 border-slate-700"></div>

              {/* Pins */}
              <div className="grid grid-cols-2 gap-4 sm:gap-8">
                {/* Left side pins */}
                <div className="space-y-3 sm:space-y-4">
                  {[1, 2, 3, 4].map(pin => (
                    <button
                      key={pin}
                      onClick={() => handlePinClick(pin)}
                      className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all transform hover:scale-105 hover:shadow-lg ${
                        selectedPin === pin
                          ? `${pinConfigs[pin].color} border-white shadow-lg scale-105`
                          : 'bg-slate-700 border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="font-bold text-white">{pin}</span>
                        <span className="text-white font-mono">{pinConfigs[pin].name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right side pins */}
                <div className="space-y-3 sm:space-y-4">
                  {[8, 7, 6, 5].map(pin => (
                    <button
                      key={pin}
                      onClick={() => handlePinClick(pin)}
                      className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all transform hover:scale-105 hover:shadow-lg ${
                        selectedPin === pin
                          ? `${pinConfigs[pin].color} border-white shadow-lg scale-105`
                          : 'bg-slate-700 border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-2 text-xs sm:text-sm">
                        <span className="text-white font-mono">{pinConfigs[pin].name}</span>
                        <span className="font-bold text-white">{pin}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Animated glow effect */}
            {selectedPin && (
              <div className="absolute inset-0 rounded-lg animate-pulse pointer-events-none">
                <div className={`absolute inset-0 ${pinConfigs[selectedPin].color} opacity-20 blur-xl rounded-lg`}></div>
              </div>
            )}
          </div>
        </div>

        {/* LCD Display / Calculator Area */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-4 sm:p-8 rounded-lg border border-blue-500/30">
          {selectedPin ? (
            <div className="space-y-4 sm:space-y-6">
              {/* LCD Header */}
              <div className="bg-gradient-to-r from-green-900 to-green-950 p-3 sm:p-4 rounded-lg border-4 border-green-950 shadow-inner">
                <div className="bg-green-400 text-green-950 p-2 sm:p-3 rounded font-mono text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span>PIN {selectedPin}: {pinConfigs[selectedPin].name}</span>
                    <span className="animate-pulse">{cursorBlink ? '█' : ' '}</span>
                  </div>
                  {lcdText && (
                    <div className="mt-2 text-[10px] sm:text-xs border-t border-green-950/30 pt-2">
                      {lcdText}
                    </div>
                  )}
                </div>
              </div>

              {/* Pin Info */}
              <div className={`p-3 sm:p-4 rounded-lg ${pinConfigs[selectedPin].color} bg-opacity-20 border border-current`}>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{pinConfigs[selectedPin].title}</h3>
                <p className="text-slate-300 text-xs sm:text-sm">{pinConfigs[selectedPin].desc}</p>
              </div>

              {/* Calculator Form */}
              {pinConfigs[selectedPin].hasCalculator && (
                <form onSubmit={handleCalculate} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-slate-400 mb-2">Delay (seconds)</label>
                      <input
                        type="number"
                        name="delay"
                        step="0.001"
                        defaultValue="5"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-slate-400 mb-2">Voltage (V)</label>
                      <input
                        type="number"
                        name="voltage"
                        step="0.1"
                        defaultValue="12"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-slate-400 mb-2">Load (mA)</label>
                      <input
                        type="number"
                        name="current"
                        step="1"
                        defaultValue="100"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={animating}
                    className="w-full py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <Calculator size={18} />
                    {animating ? 'Calculating...' : 'Calculate Components'}
                  </button>
                </form>
              )}

              {/* Results */}
              {calculation && calculation.valid && (
                <div className="space-y-3 sm:space-y-4 animate-fade-in">
                  {/* Component Values */}
                  <div className="bg-slate-900 p-3 sm:p-4 rounded-lg border border-blue-500/30">
                    <h4 className="text-sm sm:text-base font-bold text-blue-400 mb-3">Component Values</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-slate-400">Resistor (R)</p>
                        <p className="text-white font-mono font-bold">{(calculation.resistor / 1000).toFixed(1)} kΩ</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Capacitor (C)</p>
                        <p className="text-white font-mono font-bold">{calculation.capacitor} µF</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Actual Delay</p>
                        <p className="text-white font-mono font-bold">{calculation.actualDelay} s</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Error</p>
                        <p className={`font-mono font-bold ${Math.abs(parseFloat(calculation.delayError)) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {calculation.delayError}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transistor Info */}
                  <div className="bg-slate-900 p-3 sm:p-4 rounded-lg border border-purple-500/30">
                    <h4 className="text-sm sm:text-base font-bold text-purple-400 mb-3">Transistor Selection</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span className="text-white font-bold">{calculation.transistor.name}</span>
                     
