import { SpeechRecognitionService } from '@/lib/speech/SpeechRecognitionService';

export class BrowserSpeechRecognition extends SpeechRecognitionService {
  constructor() {
    super();
    this.transcript = '';
    this.recognition = null;
    this.isRecording = false;
    this.startTime = null;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.lastError = null;
  }

  async startRecording() {
    if (this.isRecording) {
      return;
    }

    // Reset error state
    this.lastError = null;

    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Browser SpeechRecognition is unavailable on this device/browser. Try Chrome or Safari.');
    }

    // Reset state
    this.transcript = '';
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.isRecording = true;
    this.startTime = performance.now();

    // Create recognition instance
    this.recognition = new SpeechRecognition();
    
    // Configuration for better accuracy
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
    this.recognition.lang = 'en-US'; // Set language
    
    // Handle results
    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        if (result.isFinal) {
          // Use the highest confidence alternative
          const bestAlternative = result[0];
          this.finalTranscript += bestAlternative.transcript + ' ';
          this.transcript = this.finalTranscript + this.interimTranscript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      this.interimTranscript = interim;
      this.transcript = this.finalTranscript + this.interimTranscript;
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.lastError = event.error;
      
      // Don't throw for all errors - some are recoverable
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // These might be temporary - keep recording
        return;
      }
      
      // Store the error but don't throw from event handler
      this.lastError = event.error;
    };

    // Handle end event
    this.recognition.onend = () => {
      this.isRecording = false;
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (error) {
      this.isRecording = false;
      throw new Error(`Failed to start speech recognition: ${error.message}`);
    }
  }

  async stopRecording() {
    if (!this.recognition || !this.isRecording) {
      return {
        transcript: this.transcript.trim(),
        confidence: this.transcript.trim().length > 0 ? 0.7 : 0.4,
        processingTimeMs: 0
      };
    }

    // Stop recognition
    this.recognition.stop();
    this.isRecording = false;
    
    const processingTimeMs = this.startTime ? Math.round(performance.now() - this.startTime) : 0;
    const transcript = this.transcript.trim();
    
    // Calculate confidence based on transcript length and quality
    let confidence = 0.7; // Base confidence
    
    if (this.lastError === 'not-allowed') {
      // Microphone permission denied - very low confidence
      confidence = 0.1;
    } else if (transcript.length === 0) {
      confidence = 0.4; // No transcript
    } else if (transcript.length > 50) {
      confidence = 0.85; // Good length transcript
    } else if (transcript.length > 20) {
      confidence = 0.75; // Moderate length
    }
    
    return {
      transcript,
      confidence,
      processingTimeMs
    };
  }

  async transcribe() {
    return {
      transcript: this.transcript.trim(),
      confidence: this.transcript.trim().length > 0 ? 0.7 : 0.4,
      processingTimeMs: 0
    };
  }
}
