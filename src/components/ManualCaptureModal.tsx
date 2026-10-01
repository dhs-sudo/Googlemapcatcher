import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Clipboard,
  Sparkles,
  Navigation,
  FileText,
  Camera,
  Check,
  AlertCircle,
  Phone,
  Key,
  MapPin,
} from 'lucide-react';
import { ParsedAddress } from '../types';
import { parseCustomerAddress } from '../utils/addressParser';
import { triggerHaptic } from '../utils/audio';

interface SmartCaptureViewProps {
  onCaptureAndNavigate: (parsed: ParsedAddress) => void;
}

export const SmartCaptureView: React.FC<SmartCaptureViewProps> = ({
  onCaptureAndNavigate,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [parsed, setParsed] = useState<ParsedAddress | null>(null);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setSpeechSupported(hasSpeech);
    }
  }, []);

  // Update parsed result whenever input text changes
  useEffect(() => {
    if (inputText.trim()) {
      const res = parseCustomerAddress(inputText, 'manual_paste');
      setParsed(res);
    } else {
      setParsed(null);
    }
  }, [inputText]);

  // Voice recognition toggle
  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: any; webkitSpeechRecognition: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser environment.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic(50);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech error', err);
      setIsListening(false);
    }
  };

  const handleReadClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        triggerHaptic(35);
      }
    } catch {
      alert('Please allow clipboard permission or paste the text directly into the box.');
    }
  };

  const loadPreset = (presetText: string) => {
    setInputText(presetText);
    triggerHaptic(30);
  };

  const handleConfirm = () => {
    if (parsed) {
      onCaptureAndNavigate(parsed);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Intro card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Smart Address Extraction & Voice Dictation</span>
            </h2>
            <p className="text-xs text-slate-300">
              Paste raw customer messages, courier manifests, WhatsApp texts, or dictate hands-free. AutoNav extracts the clean destination and passes it to Google Maps on your phone.
            </p>
          </div>

          <button
            onClick={handleReadClipboard}
            className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Clipboard className="w-4 h-4" />
            <span>Read Clipboard</span>
          </button>
        </div>
      </div>

      {/* Main Input Text Area with Voice Trigger */}
      <div className="relative bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-400">
            Raw Customer Text or Spoken Address
          </label>
          {speechSupported && (
            <button
              onClick={toggleListening}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Listening... Tap to stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>Voice Dictate</span>
                </>
              )}
            </button>
          )}
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type customer info... E.g., 'Deliver to Sarah Miller, 850 Mission St Apt 304, San Francisco, CA 94103. Phone 415-555-0182. Buzz code 304.'"
          rows={4}
          className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
        />

        {/* Quick sample chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Quick Test Samples:</span>
          <button
            onClick={() =>
              loadPreset(
                'Customer: Alex Rivera, 500 Howard St Ste 400, San Francisco, CA 94105. Phone: 415-888-2199. Gate code #8821. Reception desk.'
              )
            }
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
          >
            SF Office Tower
          </button>
          <button
            onClick={() =>
              loadPreset(
                'Deliver to Dr. Chloe Vance, 1000 N Michigan Ave, Chicago, IL 60611. Cell 312-555-9011. Deliver to 12th floor lobby.'
              )
            }
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
          >
            Chicago Hospital
          </button>
          <button
            onClick={() =>
              loadPreset(
                'Order #892: Kevin Patel, 350 Ocean Ave Apt 2B, Santa Monica, CA 90402. Text 310-555-4321. Buzzer 22.'
              )
            }
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
          >
            LA Coastal Apt
          </button>
        </div>
      </div>

      {/* Parser Live Breakdown Card */}
      {parsed ? (
        <div className="bg-slate-800/90 border border-emerald-500/50 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Parsed Target Destination
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              Confidence: {Math.round(parsed.confidence * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">
                Clean Google Maps Address
              </span>
              <p className="text-white font-semibold text-sm">
                {parsed.formattedAddress}
              </p>
              {parsed.unit && (
                <span className="text-emerald-400 mt-1 block font-medium">
                  {parsed.unit}
                </span>
              )}
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2">
              <div>
                <span className="text-[11px] text-slate-400 block">Customer Name</span>
                <p className="text-white font-medium">
                  {parsed.customerName || 'Customer'}
                </p>
              </div>

              {parsed.phone && (
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{parsed.phone}</span>
                </div>
              )}

              {parsed.gateCode && (
                <div className="flex items-center gap-1.5 text-amber-300 font-mono">
                  <Key className="w-3.5 h-3.5" />
                  <span>Gate Code: {parsed.gateCode}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Navigation className="w-4 h-4 -rotate-45" />
            <span>Launch Google Maps with this Destination</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
          <MapPin className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
          <p>Type or paste an address above to preview the auto-parsed Google Maps route.</p>
        </div>
      )}
    </div>
  );
};
