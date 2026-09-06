import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ArrowLeft,
  Clock,
  Printer,
  ChevronRight,
  AlertTriangle,
  FileText,
  User,
  HeartPulse,
  Mic,
  MicOff,
  Square,
  Globe,
  Loader2,
  Languages,
  CheckCircle2,
  X,
  Volume2,
  Stethoscope,
  ShieldCheck,
  Bed as BedIcon,
  Building,
  MapPin,
  Compass,
  Navigation,
  FileDown,
  Zap,
  ClipboardList,
} from 'lucide-react';
import {
  submitTriageChat,
  transcribePatientAudio,
  fetchDoctors,
  subscribeToLiveEvents,
  fetchPatientStatus,
  allocateBestBedForPatient,
} from '../services/api';
import type { TriageMessage, Patient, TriageLevel, DoctorUser, BedAllocationNotification } from '../types';
import { VitalisBotAvatar } from './VitalisBotAvatar';
import { AssessmentSheetModal } from './AssessmentSheetModal';
import { BedAllocationCard } from './BedAllocationCard';
import {
  AssessmentSheetData,
  printAssessmentSheetDocument,
  downloadAssessmentSheet,
} from '../utils/printAssessmentSheet';

interface PatientTriageChatProps {
  onNavigateHome: () => void;
  onPatientAdmitted?: (patient: Patient) => void;
  activeDoctor?: DoctorUser;
}

export const PatientTriageChat: React.FC<PatientTriageChatProps> = ({
  onNavigateHome,
  activeDoctor,
}) => {
  const [messages, setMessages] = useState<TriageMessage[]>([
    {
      id: 'msg-init',
      sender: 'ai',
      text: "Hello! 👋 I'm your Vitalis AI Triage Bot. You can type or tap the microphone 🎙️ to speak your symptoms directly in ANY language (English, Spanish, Hindi, French, Mandarin, Arabic, Marathi, etc.). How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [structuredAssessment, setStructuredAssessment] = useState<any | null>(null);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [showWaitingRoom, setShowWaitingRoom] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Doctor Assignment & Assessment Sheet Modal State
  const [availableDoctors, setAvailableDoctors] = useState<DoctorUser[]>(activeDoctor ? [activeDoctor] : []);
  const [assignedDoctor, setAssignedDoctor] = useState<DoctorUser | null>(activeDoctor || null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);

  // Bed & Room Allocation State
  const [allocatedBedInfo, setAllocatedBedInfo] = useState<BedAllocationNotification | null>(null);
  const [isSimulatingAllocation, setIsSimulatingAllocation] = useState<boolean>(false);
  const hasNotifiedBotBed = useRef<string | null>(null);

  // Speech-to-Text State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [liveSpeechInterim, setLiveSpeechInterim] = useState<string>('');
  const [selectedSpeechLang, setSelectedSpeechLang] = useState<string>('auto');
  const [detectedSpeechMeta, setDetectedSpeechMeta] = useState<{
    language: string;
    englishTranslation?: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const webSpeechTextRef = useRef<string>('');

  const SPOKEN_LANGUAGES = [
    { code: 'auto', label: 'Auto-Detect (Any Language)', bcp: '' },
    { code: 'en', label: 'English', bcp: 'en-US' },
    { code: 'hi', label: 'हिन्दी (Hindi)', bcp: 'hi-IN' },
    { code: 'es', label: 'Español (Spanish)', bcp: 'es-ES' },
    { code: 'mr', label: 'मराठी (Marathi)', bcp: 'mr-IN' },
    { code: 'fr', label: 'Français (French)', bcp: 'fr-FR' },
    { code: 'ar', label: 'العربية (Arabic)', bcp: 'ar-SA' },
    { code: 'zh', label: '中文 (Mandarin)', bcp: 'zh-CN' },
    { code: 'bn', label: 'বাংলা (Bengali)', bcp: 'bn-IN' },
    { code: 'ta', label: 'தமிழ் (Tamil)', bcp: 'ta-IN' },
    { code: 'te', label: 'తెలుగు (Telugu)', bcp: 'te-IN' },
    { code: 'de', label: 'Deutsch (German)', bcp: 'de-DE' },
    { code: 'pt', label: 'Português (Portuguese)', bcp: 'pt-BR' },
    { code: 'ru', label: 'Русский (Russian)', bcp: 'ru-RU' },
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, structuredAssessment, isRecording, isTranscribing]);

  useEffect(() => {
    return () => {
      // Clean up audio streams and timers on unmount
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    fetchDoctors()
      .then((res) => {
        if (res.doctors && res.doctors.length > 0) {
          setAvailableDoctors(res.doctors);
          if (!activeDoctor) {
            setAssignedDoctor(res.doctors[0]);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch doctors list:', err));
  }, [activeDoctor]);

  // Handle and commit a Bed & Room Allocation to patient state and in-chat bot stream
  const handleBedAllocatedNotification = (patient: Patient, bed?: any) => {
    const roomNum = patient.roomNumber || bed?.roomNumber || 'Room Assigned';
    const bedNum = patient.bedNumber || bed?.bedNumber || 'Bed Assigned';
    const wardName = (patient.ward || bed?.ward || 'General Ward') as string;
    const floorInfo = patient.floor || bed?.floor || 'Main Clinical Wing';
    const docName =
      patient.assignedDoctorName || assignedDoctor?.name || 'Dr. Sarah Jenkins';
    const instructions =
      patient.locationInstructions ||
      bed?.locationInstructions ||
      'Please proceed to the ward nursing station on your assigned floor with your Clinical Assessment Sheet.';

    const isDirect =
      patient.triageLevel === 'CRITICAL' ||
      (patient.severity !== undefined && patient.severity >= 7) ||
      (patient.triageLevel === 'URGENT' && patient.severity !== undefined && patient.severity >= 6);

    const allocationData: BedAllocationNotification = {
      patientId: patient.id,
      patientName: patient.name,
      roomNumber: roomNum,
      ward: wardName,
      floor: floorInfo,
      bedNumber: bedNum,
      assignedDoctorName: docName,
      locationInstructions: instructions,
      allocatedAt: new Date().toISOString(),
      triageLevel: patient.triageLevel,
      isDirectAllocation: isDirect,
    };

    setAllocatedBedInfo(allocationData);
    setCreatedPatient((prev) => ({
      ...(prev || patient),
      ...patient,
      bedNumber: bedNum,
      roomNumber: roomNum,
      ward: wardName as any,
      floor: floorInfo,
      locationInstructions: instructions,
      status: 'Admitted',
    }));

    // Post in-chat Vitalis AI Bot formatted update message
    const allocationKey = `${patient.id}-${bedNum}`;
    if (hasNotifiedBotBed.current !== allocationKey) {
      hasNotifiedBotBed.current = allocationKey;

      const titleHeader = isDirect
        ? `🚨 **High-Risk Emergency Direct Bed Allocation Confirmed**`
        : `🏥 **Bed & Room Allocation Confirmed by Vitalis OS**`;

      const subHeading = isDirect
        ? `Dear ${patient.name}, because your triage condition is flagged as **HIGH ALERT (${patient.triageLevel || 'CRITICAL'} Priority, Severity ${patient.severity || 8}/10)**, Vitalis OS has directly assigned you a physical bed without waitlist delay:`
        : `Dear ${patient.name}, a hospital bed has been officially assigned to you by attending medical staff:`;

      const botNoticeMsg: TriageMessage = {
        id: `ai-bed-alloc-${Date.now()}`,
        sender: 'ai',
        text: `${titleHeader}\n\n${subHeading}\n\n• **Room Number**: ${roomNum}\n• **Ward / Department**: ${wardName}${floorInfo ? ` (${floorInfo})` : ''}\n• **Bed Number**: ${bedNum}\n• **Attending Physician**: ${docName}\n\n📍 **Direct Walking & Reception Instructions**:\n${instructions}\n\nYour Patient Assessment Sheet has been automatically stamped with your room and bed assignment coordinates.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botNoticeMsg]);
    }
  };

  // Real-time Bed Allocation SSE Subscription
  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents((event) => {
      if (!event || !event.type) return;

      if (event.type === 'bed_allocated') {
        const { patient: updatedPatient, bed: updatedBed } = event.data || {};
        if (
          updatedPatient &&
          createdPatient &&
          (updatedPatient.id === createdPatient.id ||
            updatedPatient.name.toLowerCase() === createdPatient.name.toLowerCase())
        ) {
          handleBedAllocatedNotification(updatedPatient, updatedBed);
        }
      }

      if (event.type === 'patient_updated') {
        const updatedPatient = event.data as Patient;
        if (updatedPatient && createdPatient && updatedPatient.id === createdPatient.id) {
          if (
            updatedPatient.bedNumber &&
            (!allocatedBedInfo || allocatedBedInfo.bedNumber !== updatedPatient.bedNumber)
          ) {
            handleBedAllocatedNotification(updatedPatient);
          } else {
            setCreatedPatient(updatedPatient);
          }
        }
      }

      if (event.type === 'emergency_override') {
        const { urgentPatient, bed: updatedBed } = event.data || {};
        if (urgentPatient && createdPatient && urgentPatient.id === createdPatient.id) {
          handleBedAllocatedNotification(urgentPatient, updatedBed);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [createdPatient, allocatedBedInfo, assignedDoctor]);

  // Status Polling Fallback (ensures instant sync if SSE dropped)
  useEffect(() => {
    if (!createdPatient?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchPatientStatus(createdPatient.id);
        if (res.isAllocated && res.patient.bedNumber) {
          if (!allocatedBedInfo || allocatedBedInfo.bedNumber !== res.patient.bedNumber) {
            handleBedAllocatedNotification(res.patient, res.bed);
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [createdPatient?.id, allocatedBedInfo, assignedDoctor]);

  // Simulate Instant Bed Allocation (for test / demo)
  const handleSimulateAllocation = async () => {
    if (!createdPatient?.id) return;
    setIsSimulatingAllocation(true);
    setErrorMessage('');
    try {
      const res = await allocateBestBedForPatient(
        createdPatient.id,
        assignedDoctor?.name || 'Dr. Sarah Jenkins',
        createdPatient.ward || structuredAssessment?.recommendedDepartment
      );
      if (res.patient) {
        handleBedAllocatedNotification(res.patient, res.bed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not allocate bed automatically');
    } finally {
      setIsSimulatingAllocation(false);
    }
  };

  // Load a demo waiting patient for instant testing
  const handleLoadDemoPatient = (demoId: 'pat-5' | 'pat-6' | 'pat-7') => {
    const demo: Patient =
      demoId === 'pat-5'
        ? {
            id: 'pat-5',
            name: 'Marcus Vance',
            age: 51,
            gender: 'Male',
            symptomsRaw: 'Substernal chest tightness with diaphoresis, radiating to left arm.',
            symptomsStructured: ['Chest tightness', 'Diaphoresis', 'Left arm radiation'],
            duration: '45 minutes',
            severity: 8,
            triageLevel: 'CRITICAL',
            department: 'ICU',
            estimatedWaitMinutes: 5,
            medicalHistory: ['Hypertension', 'Hyperlipidemia'],
            currentMedications: ['Amlodipine 5mg'],
            assignedDoctorId: 'doc-1',
            assignedDoctorName: 'Dr. Sarah Jenkins',
            status: 'Waiting',
            queuePosition: 1,
            createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
          }
        : demoId === 'pat-6'
        ? {
            id: 'pat-6',
            name: 'Sophie Clark',
            age: 24,
            gender: 'Female',
            symptomsRaw: 'Inverted ankle injury with extreme pain on weight-bearing.',
            symptomsStructured: ['Ankle distortion', 'Severe localized pain', 'Inability to bear weight'],
            duration: '1 hour',
            severity: 6,
            triageLevel: 'URGENT',
            department: 'Emergency',
            estimatedWaitMinutes: 15,
            medicalHistory: ['No known conditions'],
            currentMedications: ['None'],
            assignedDoctorId: 'doc-3',
            assignedDoctorName: 'Dr. Elena Rostova',
            status: 'Waiting',
            queuePosition: 2,
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
          }
        : {
            id: 'pat-7',
            name: 'Liam Brooks',
            age: 31,
            gender: 'Male',
            symptomsRaw: 'Mild intermittent dry cough and fatigue for 3 days. Vital signs normal, no dyspnea.',
            symptomsStructured: ['Dry cough', 'Mild fatigue', 'Normal respiration'],
            duration: '3 days',
            severity: 3,
            triageLevel: 'NON-URGENT',
            department: 'General Ward',
            estimatedWaitMinutes: 30,
            medicalHistory: ['Seasonal allergies'],
            currentMedications: ['Cetirizine 10mg'],
            assignedDoctorId: 'doc-1',
            assignedDoctorName: 'Dr. Sarah Jenkins',
            status: 'Waiting',
            bedRequestStatus: 'pending_doctor_review',
            bedAssignmentRequest: {
              id: `req-pat-7-${Date.now()}`,
              patientId: 'pat-7',
              patientName: 'Liam Brooks',
              age: 31,
              gender: 'Male',
              severity: 3,
              triageLevel: 'NON-URGENT',
              department: 'General Ward',
              symptomsRaw: 'Mild intermittent dry cough and fatigue for 3 days.',
              symptomsStructured: ['Dry cough', 'Mild fatigue'],
              duration: '3 days',
              medicalHistory: ['Seasonal allergies'],
              currentMedications: ['Cetirizine 10mg'],
              suggestedWard: 'General Ward',
              suggestedBedNumber: 'GW-02',
              suggestedRoomNumber: 'Room 202',
              assignedDoctorId: 'doc-1',
              assignedDoctorName: 'Dr. Sarah Jenkins',
              status: 'pending',
              requestedAt: new Date().toISOString(),
            },
            queuePosition: 3,
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          };

    setPatientName(demo.name);
    setCreatedPatient(demo);
    setAllocatedBedInfo(null);
    hasNotifiedBotBed.current = null;
    setStructuredAssessment({
      patientName: demo.name,
      triageLevel: demo.triageLevel,
      severity: demo.severity,
      recommendedDepartment: demo.department,
      estimatedWaitMinutes: demo.estimatedWaitMinutes,
      duration: demo.duration,
      primarySymptoms: demo.symptomsStructured,
      clinicalRationale:
        demo.bedRequestStatus === 'pending_doctor_review'
          ? `Non-serious intake for ${demo.name}. Bed request routed directly to attending doctor for clinical review and authorization.`
          : `Priority triage record loaded for ${demo.name}. Attending physician on alert.`,
      assignedDoctorName: demo.assignedDoctorName,
      medicalHistory: demo.medicalHistory,
    });
    setMessages([
      {
        id: `demo-init-${Date.now()}`,
        sender: 'ai',
        text:
          demo.bedRequestStatus === 'pending_doctor_review'
            ? `Loaded demo non-serious intake for **${demo.name}** (Severity ${demo.severity}/10, ${demo.triageLevel}).\n\n📌 **Doctor Review Protocol Active**: Because this patient is not serious, their bed assignment request has been routed directly to **${demo.assignedDoctorName}'s profile** for review and approval instead of auto-assigning a bed immediately! Switch to the Doctor Portal to see the pending request card with Approve and Decline actions.`
            : `Loaded demo waiting intake for **${demo.name}** (Queue #${demo.queuePosition}, ${demo.triageLevel} Priority).\n\nYou can allocate a bed to this patient directly from the Doctor Portal, or click the **"Simulate Bed Allocation"** button below to test the real-time notification card and in-chat bot delivery!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceRecording = async () => {
    setErrorMessage('');
    setDetectedSpeechMeta(null);
    setLiveSpeechInterim('');
    webSpeechTextRef.current = '';
    if (isThinking || isTranscribing) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone access is not supported by your browser environment. Please type your message.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let chosenMime = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(chosenMime)) {
          chosenMime = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
        }
      }

      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        const clientFallbackText = webSpeechTextRef.current.trim();

        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          if (clientFallbackText) {
            setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${clientFallbackText}` : clientFallbackText));
            setDetectedSpeechMeta({ language: 'Spoken Input' });
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        setIsRecording(false);
        setIsTranscribing(true);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            const res = await transcribePatientAudio({
              audioBase64: base64Data,
              mimeType: audioBlob.type || 'audio/webm',
            });

            const effectiveTranscript = (res.transcript && res.transcript.trim()) || clientFallbackText;

            if (effectiveTranscript) {
              setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${effectiveTranscript}` : effectiveTranscript));
              setDetectedSpeechMeta({
                language: res.language && res.language !== 'Unrecognized' ? res.language : 'Spoken Voice Input',
                englishTranslation:
                  res.englishTranslation &&
                  res.englishTranslation.toLowerCase().trim() !== effectiveTranscript.toLowerCase().trim()
                    ? res.englishTranslation
                    : undefined,
              });
              setErrorMessage('');

              if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.style.height = 'auto';
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                  }
                }, 50);
              }
            } else {
              setErrorMessage('No clear speech was heard. Please speak clearly into your microphone or type your message.');
            }
          } catch (err: any) {
            if (clientFallbackText) {
              setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${clientFallbackText}` : clientFallbackText));
              setDetectedSpeechMeta({ language: 'Spoken Voice Input' });
              setErrorMessage('');
            } else {
              setErrorMessage(err.message || 'Speech recognition failed. Please try speaking clearly or type your symptoms.');
            }
          } finally {
            setIsTranscribing(false);
            setLiveSpeechInterim('');
          }
        };
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Browser Web Speech API for real-time live preview & instant transcription fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          const chosenLang = SPOKEN_LANGUAGES.find((l) => l.code === selectedSpeechLang);
          if (chosenLang && chosenLang.bcp) {
            rec.lang = chosenLang.bcp;
          } else {
            rec.lang = navigator.language || 'en-US';
          }

          rec.onresult = (evt: any) => {
            let fullText = '';
            for (let i = 0; i < evt.results.length; ++i) {
              fullText += evt.results[i][0].transcript;
            }
            if (fullText) {
              webSpeechTextRef.current = fullText;
              setLiveSpeechInterim(fullText);
            }
          };

          rec.onerror = () => {
            // Silently allow audio recording to proceed via Gemini STT backend
          };

          rec.start();
          recognitionRef.current = rec;
        } catch {
          // Fallback to Gemini STT backend only
        }
      }
    } catch (err: any) {
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permission in your browser to speak directly.');
      } else {
        setErrorMessage('Microphone notice: ' + (err.message || 'Could not initialize microphone'));
      }
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsTranscribing(false);
    setLiveSpeechInterim('');
  };

  // Suggestion chips
  const suggestionChips = [
    'Severe Chest Pain & Shortness of Breath',
    'High Fever with Rigid Neck (39.5°C)',
    'Suspected Ankle Fracture & Swelling',
    'Mild Cough, Sore Throat & Fatigue',
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isThinking) return;

    // Detect patient name from early responses if not yet recorded
    if (!patientName) {
      const match = textToSend.match(/(?:my name is|i am|i'm|name:?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
      if (match && match[1]) {
        setPatientName(match[1].trim());
      } else if (!textToSend.includes(' ') && textToSend.length < 25) {
        setPatientName(textToSend.trim());
      }
    }

    const userMsg: TriageMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsThinking(true);
    setErrorMessage('');

    try {
      const chatHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await submitTriageChat({
        patientName: patientName || 'Intake Patient',
        message: textToSend,
        chatHistory,
      });

      const aiMsg: TriageMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (res.structuredData) {
        setStructuredAssessment(res.structuredData);
        if (res.patient) {
          setCreatedPatient(res.patient);
          if (res.patient.assignedDoctorName) {
            const matched = availableDoctors.find((d) => d.name === res.patient.assignedDoctorName);
            if (matched) {
              setAssignedDoctor(matched);
            }
          }
          // Direct Bed Allocation Handling: if patient is high risk or directly allocated
          if (res.patient.bedNumber) {
            handleBedAllocatedNotification(res.patient);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with Triage AI. Please retry.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const currentSheetData: AssessmentSheetData = {
    patientId: createdPatient?.id || 'VTL-INTAKE',
    patientName: structuredAssessment?.patientName || patientName || 'Intake Patient',
    status: createdPatient?.status || 'Waiting',
    triageLevel: (structuredAssessment?.triageLevel as TriageLevel) || 'URGENT',
    severity: structuredAssessment?.severity || 5,
    department: structuredAssessment?.recommendedDepartment || 'Emergency Department',
    estimatedWaitMinutes: structuredAssessment?.estimatedWaitMinutes || 15,
    duration: structuredAssessment?.duration || 'Recent onset',
    symptoms: structuredAssessment?.primarySymptoms || [
      inputMessage || 'Acute medical presentation recorded during triage.',
    ],
    rawSymptoms: messages.filter((m) => m.sender === 'user').map((m) => m.text).join('\n') || inputMessage,
    clinicalRationale:
      structuredAssessment?.clinicalRationale ||
      'Patient presenting for emergent intake triage. Immediate physical examination, telemetry vital monitoring, and physician evaluation recommended.',
    medicalHistory: structuredAssessment?.medicalHistory || [],
    assignedDoctorName:
      assignedDoctor?.name ||
      structuredAssessment?.assignedDoctorName ||
      createdPatient?.assignedDoctorName ||
      'Dr. Sarah Jenkins',
    assignedDoctorId:
      assignedDoctor?.id ||
      structuredAssessment?.assignedDoctorId ||
      createdPatient?.assignedDoctorId ||
      'doc-1',
    assignedDoctorDepartment:
      assignedDoctor?.department ||
      structuredAssessment?.assignedDoctorDepartment ||
      'Emergency & Critical Care',
    assignedDoctorLicense:
      assignedDoctor?.licenseNumber ||
      structuredAssessment?.assignedDoctorLicense ||
      'MD-84920-CA',
    hospitalName: assignedDoctor?.hospitalName || 'Vitalis OS Central Hospital',
    createdAt: createdPatient?.createdAt || new Date().toISOString(),
    bedId: allocatedBedInfo?.patientId ? createdPatient?.bedId : undefined,
    bedNumber: allocatedBedInfo?.bedNumber || createdPatient?.bedNumber,
    roomNumber: allocatedBedInfo?.roomNumber || createdPatient?.roomNumber,
    ward: allocatedBedInfo?.ward || createdPatient?.ward || structuredAssessment?.recommendedDepartment,
    floor: allocatedBedInfo?.floor || createdPatient?.floor,
    locationInstructions: allocatedBedInfo?.locationInstructions || createdPatient?.locationInstructions,
    admittedAt: createdPatient?.admittedAt || allocatedBedInfo?.allocatedAt,
  };

  const openAssessmentSheetModal = () => {
    setIsAssessmentModalOpen(true);
  };

  const printSummary = () => {
    openAssessmentSheetModal();
  };

  const getTriageBadge = (level?: TriageLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            CRITICAL PRIORITY (LEVEL 1)
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            URGENT (LEVEL 2)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            NON-URGENT (LEVEL 3)
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <button
          id="patient-triage-back-btn"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </button>

        <div className="flex items-center gap-2.5">
          <VitalisBotAvatar size="xs" animated={true} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">Vitalis Triage Bot</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="chat-header-print-assessment-btn"
            onClick={openAssessmentSheetModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Print or view Clinical Assessment Sheet with attending doctor's full name"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Assessment Sheet</span>
            <span className="sm:hidden">Print Sheet</span>
          </button>

          {structuredAssessment && (
            <button
              onClick={() => setShowWaitingRoom(!showWaitingRoom)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {showWaitingRoom ? 'View Chat' : 'Waiting Room'}
            </button>
          )}
        </div>
      </div>

      {/* Main View Area: Chat OR Waiting Room */}
      {!showWaitingRoom ? (
        <div className="flex-1 flex flex-col overflow-hidden pt-4">
          {/* Prominent Real-time Bed Allocation Notification Card */}
          {allocatedBedInfo && (
            <div className="mb-3 shrink-0">
              <BedAllocationCard
                allocation={allocatedBedInfo}
                onPrintSheet={openAssessmentSheetModal}
                onDownloadSheet={() => downloadAssessmentSheet(currentSheetData)}
                variant="prominent"
              />
            </div>
          )}

          {/* Pending Allocation Simulation Banner (when intake recorded but bed pending) */}
          {!allocatedBedInfo && createdPatient && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2.5 text-amber-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>
                  Intake recorded for <strong>{createdPatient.name}</strong>. Awaiting hospital bed and room allocation from attending doctor.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulateAllocation}
                disabled={isSimulatingAllocation}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                title="Trigger immediate bed assignment to test the real-time card and in-chat bot notification"
              >
                {isSimulatingAllocation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Allocating Bed...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simulate Bed Allocation</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* Welcoming Bot Hero Card */}
            <div className="bg-gradient-to-r from-blue-50/80 via-orange-50/40 to-slate-50 border border-blue-100/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <VitalisBotAvatar size="lg" animated={true} />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold mb-1">
                    <span>Vitalis AI Companion</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Hi! I'm Vitalis, your AI Health Bot 👋
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Tell me your symptoms and how you feel. I'll evaluate emergency priority in real time and prepare your clinical intake.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700 font-semibold">
                      <Mic className="w-3 h-3 text-blue-600" />
                      Speech-to-Text Enabled
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      <Globe className="w-3 h-3 text-slate-500" />
                      Any Language Supported
                    </span>
                  </div>
                </div>
              </div>

              {/* Demo test helper */}
              {!createdPatient && !structuredAssessment && (
                <div className="flex flex-col items-start sm:items-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quick Test Waitlist:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleLoadDemoPatient('pat-5')}
                      className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-bold text-[11px] border border-red-200 cursor-pointer transition-colors"
                      title="Load Marcus Vance (Critical #1 waiting for ICU/ER bed)"
                    >
                      Marcus Vance (#1)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadDemoPatient('pat-6')}
                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 cursor-pointer transition-colors"
                      title="Load Sophie Clark (Urgent #2 waiting for ER bed)"
                    >
                      Sophie Clark (#2)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadDemoPatient('pat-7')}
                      className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] border border-indigo-200 cursor-pointer transition-colors"
                      title="Load Liam Brooks (Non-Serious #3 - Bed Request Routed to Doctor for Approval)"
                    >
                      Liam Brooks (#3 - Doctor Review)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {messages.map((m) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <VitalisBotAvatar size="sm" animated={true} />
                  )}

                  <div
                    className={`max-w-[82%] sm:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${
                      isAi
                        ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                        : 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-500/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <span
                      className={`text-[10px] block mt-1.5 ${
                        isAi ? 'text-slate-400' : 'text-blue-200 text-right'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {!isAi && (
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isThinking && (
              <div className="flex items-start gap-3 justify-start">
                <VitalisBotAvatar size="sm" animated={true} />
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs text-slate-500 flex items-center gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="font-medium text-slate-600">Vitalis Bot is analyzing clinical urgency...</span>
                </div>
              </div>
            )}

            {/* Inline In-Chat Assessment Action Banner */}
            {structuredAssessment && (
              <div
                id="inchat-assessment-action-card"
                className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-2xl p-4 text-xs shadow-xs space-y-3 animate-in fade-in"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          Assessment Sheet Ready
                        </span>
                        {getTriageBadge(structuredAssessment.triageLevel)}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        <span>Attending Doctor: </span>
                        <span className="text-blue-900 font-extrabold">{currentSheetData.assignedDoctorName}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Patient: <strong>{currentSheetData.patientName}</strong> • License: {currentSheetData.assignedDoctorLicense} • Dept: {currentSheetData.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="inchat-print-sheet-btn"
                      onClick={openAssessmentSheetModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sheet</span>
                    </button>
                    <button
                      id="inchat-view-sheet-btn"
                      onClick={openAssessmentSheetModal}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Doctor Details</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* In-Chat Real-time Bed Allocation Card */}
            {allocatedBedInfo && (
              <div id="inchat-bed-allocation-card" className="animate-in fade-in">
                <BedAllocationCard
                  allocation={allocatedBedInfo}
                  onPrintSheet={openAssessmentSheetModal}
                  onDownloadSheet={() => downloadAssessmentSheet(currentSheetData)}
                  variant="chat-inline"
                />
              </div>
            )}

            {/* Assessment Complete Card */}
            {structuredAssessment && (
              <div
                id="triage-assessment-summary-card"
                className="mt-6 p-5 sm:p-6 rounded-2xl bg-white border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Triage Evaluation Complete
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">
                      {structuredAssessment.patientName || patientName || 'Patient'} Intake Summary
                    </h3>
                  </div>
                  <div>{getTriageBadge(structuredAssessment.triageLevel)}</div>
                </div>

                {/* Attending Physician Section */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                        Attending Physician (Clinical Access Authorized)
                      </span>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{currentSheetData.assignedDoctorName}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          Full Clinical Access
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        License: <strong>{currentSheetData.assignedDoctorLicense}</strong> • Dept: {currentSheetData.assignedDoctorDepartment}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={openAssessmentSheetModal}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                  >
                    <span>View / Change Doctor</span>
                  </button>
                </div>

                {/* Bed and Room Allocation Status Block */}
                {allocatedBedInfo ? (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-xl border border-emerald-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <BedIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          Bed & Room Allocation Confirmed
                        </span>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <span>{allocatedBedInfo.roomNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-800 font-mono font-bold">Bed {allocatedBedInfo.bedNumber}</span>
                          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                            {allocatedBedInfo.ward}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {allocatedBedInfo.floor} • Instructions stamped on Assessment Sheet
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openAssessmentSheetModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Stamped Sheet</span>
                    </button>
                  </div>
                ) : createdPatient?.bedRequestStatus === 'pending_doctor_review' ? (
                  <div className="p-3.5 bg-linear-to-r from-indigo-50 via-blue-50 to-indigo-50 rounded-xl border border-indigo-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 block">
                          Routed Directly to Doctor Profile for Review & Approval
                        </span>
                        <div className="font-bold text-slate-900 text-sm">
                          Stable Patient Protocol Active
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Because this patient is non-serious, bed allocation is routed directly to {createdPatient.assignedDoctorName || 'the attending physician'}'s profile for clinical review instead of auto-assigning immediately.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold text-[11px] shrink-0 border border-indigo-200">
                      Awaiting Doctor Approval
                    </span>
                  </div>
                ) : (
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                      createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7
                        ? 'bg-red-50 border-red-300 text-red-900 shadow-xs'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7
                            ? 'bg-red-600 animate-ping'
                            : 'bg-amber-500 animate-pulse'
                        }`}
                      />
                      <div>
                        {createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7 ? (
                          <div>
                            <span className="font-black text-red-900 block">
                              🚨 HIGH ALERT PATIENT: Immediate Direct Bed Allocation Required
                            </span>
                            <span className="text-[11px] text-red-800">
                              Acuity level requires direct bypass of standard waiting room intake.
                            </span>
                          </div>
                        ) : (
                          <span>
                            Bed allocation pending clinical prioritization. Attending physician is reviewing unit vacancy.
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateAllocation}
                      disabled={isSimulatingAllocation}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 ${
                        createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {isSimulatingAllocation ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7 ? (
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {createdPatient?.triageLevel === 'CRITICAL' || (createdPatient?.severity || 0) >= 7
                          ? 'Directly Assign Bed Now (High Alert)'
                          : 'Simulate Bed Allocation'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 block mb-1">Recommended Ward</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {structuredAssessment.recommendedDepartment || 'Emergency Dept'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 block mb-1">Severity Assessment</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {structuredAssessment.severity || 5} / 10 Scale
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 block mb-1">Estimated Wait Time</span>
                    <span className="font-bold text-blue-600 text-sm flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {structuredAssessment.estimatedWaitMinutes ?? 10} Minutes
                    </span>
                  </div>
                </div>

                {/* Clinical rationale */}
                {structuredAssessment.clinicalRationale && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <span className="font-bold block mb-0.5">Clinical Impression & Rationale:</span>
                    <p>{structuredAssessment.clinicalRationale}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    id="triage-go-waiting-room-btn"
                    onClick={() => setShowWaitingRoom(true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <span>Go to Waiting Room</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    id="triage-print-summary-btn"
                    onClick={openAssessmentSheetModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                    <span>Print Assessment Sheet</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Active Voice Recording Status Bar */}
          {isRecording && (
            <div
              id="voice-recording-active-banner"
              className="mb-2 p-3 rounded-2xl bg-red-50/95 border border-red-200 flex flex-col gap-2.5 shadow-xs animate-in fade-in"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-ping absolute" />
                    <span className="w-3 h-3 rounded-full bg-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-red-800 tracking-wider uppercase">
                        Listening ({formatDuration(recordingDuration)})
                      </span>
                      {/* Animated sound wave bars */}
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.1s] h-2" />
                        <span className="w-1 bg-red-600 rounded-full animate-bounce [animation-delay:0.25s] h-3" />
                        <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.15s] h-2.5" />
                        <span className="w-1 bg-red-600 rounded-full animate-bounce [animation-delay:0.35s] h-3.5" />
                      </div>
                    </div>
                    <p className="text-[11px] text-red-700 mt-0.5 font-medium">
                      {liveSpeechInterim ? (
                        <span className="font-semibold text-red-900 bg-red-100/80 px-1.5 py-0.5 rounded-md">
                          "{liveSpeechInterim}"
                        </span>
                      ) : (
                        'Speak in ANY language (English, Hindi, Spanish, French, Mandarin, Marathi, etc.)...'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Language Selector */}
                  <div className="flex items-center gap-1 text-[11px] bg-white/90 border border-red-200 rounded-lg px-2 py-1">
                    <Globe className="w-3 h-3 text-red-600 shrink-0" />
                    <select
                      value={selectedSpeechLang}
                      onChange={(e) => setSelectedSpeechLang(e.target.value)}
                      className="bg-transparent text-slate-700 font-medium outline-hidden cursor-pointer"
                      title="Select language"
                    >
                      {SPOKEN_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Done Speaking</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcribing loader */}
          {isTranscribing && (
            <div className="mb-2 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 flex items-center justify-between gap-2.5 text-xs text-blue-800 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <span className="font-semibold">Transcribing speech with Gemini Speech-to-Text...</span>
              </div>
              <span className="text-[10px] text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-md font-bold">
                Multilingual AI
              </span>
            </div>
          )}

          {/* Detected Speech Metadata Banner */}
          {detectedSpeechMeta && !isRecording && !isTranscribing && (
            <div className="mb-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-blue-900">Spoken Language: {detectedSpeechMeta.language}</span>
                  <span className="text-blue-700 ml-1.5">— Transcribed into message input.</span>
                  {detectedSpeechMeta.englishTranslation && (
                    <p className="text-[11px] text-blue-800 mt-0.5 italic">
                      English Translation: "{detectedSpeechMeta.englishTranslation}"
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetectedSpeechMeta(null)}
                className="text-blue-400 hover:text-blue-700 p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="my-2 p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={startVoiceRecording}
                  className="px-2 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 font-bold text-[11px] cursor-pointer"
                >
                  Try Speaking Again
                </button>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          {!structuredAssessment && (
            <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Quick prompts:</span>
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isThinking || isRecording || isTranscribing}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="pt-2">
            <div className="relative flex items-end bg-white border border-slate-300 rounded-2xl p-2 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
              <textarea
                id="patient-triage-input"
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  patientName
                    ? `Speak or type symptoms in any language, ${patientName}...`
                    : 'Speak or type in any language (e.g. "I have chest pressure" or "मुझे चक्कर आ रहे हैं")...'
                }
                className="w-full resize-none max-h-28 px-3 py-1.5 text-sm bg-transparent outline-hidden text-slate-800 placeholder:text-slate-400"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {isRecording ? (
                  <button
                    id="patient-voice-stop-btn"
                    type="button"
                    onClick={stopVoiceRecording}
                    title="Stop speaking and transcribe"
                    className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md shadow-red-500/20 animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : isTranscribing ? (
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <button
                    id="patient-voice-record-btn"
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={isThinking}
                    title="Speak in any language (Gemini Speech-to-Text)"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40 border border-slate-200 shadow-xs"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="patient-chat-quick-print-btn"
                  type="button"
                  onClick={openAssessmentSheetModal}
                  title="Print Clinical Assessment Sheet (Attending Doctor Access)"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center shrink-0 transition-all cursor-pointer border border-slate-200 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                </button>

                <button
                  id="patient-triage-send-btn"
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isThinking || isRecording || isTranscribing}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                <Mic className="w-3 h-3 text-blue-500" />
                <span>Tap mic to speak</span>
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={openAssessmentSheetModal}
                className="hover:text-blue-600 font-semibold cursor-pointer"
              >
                Print Assessment Sheet
              </button>
              <span>•</span>
              <span>Press Enter</span>
            </p>
          </div>
        </div>
      ) : (
        /* Waiting Room & Queue Status View */
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Prominent Bed Allocation Notification in Waiting Room */}
          {allocatedBedInfo && (
            <div className="animate-in fade-in">
              <BedAllocationCard
                allocation={allocatedBedInfo}
                onPrintSheet={openAssessmentSheetModal}
                onDownloadSheet={() => downloadAssessmentSheet(currentSheetData)}
                variant="prominent"
              />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <VitalisBotAvatar size="lg" animated={true} />
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Intake Status</span>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">Vitalis OS Digital Waiting Room</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your case has been structured and transmitted to the clinical coordination matrix.
                  </p>
                </div>
              </div>
              <div className="text-center bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shrink-0 self-start sm:self-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Queue Position</span>
                <span className="text-3xl font-black text-blue-700">
                  #{createdPatient?.queuePosition || 1}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Patient Identity</span>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {createdPatient?.name || patientName || 'Intake Patient'}
                </p>
                <div className="mt-2">{getTriageBadge(createdPatient?.triageLevel || structuredAssessment?.triageLevel)}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2">
                  <HeartPulse className="w-4 h-4 text-red-600" />
                  <span>Assigned Department & Physician</span>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {createdPatient?.assignedDoctorName || 'Dr. Sarah Jenkins (Trauma On-Call)'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ward: {createdPatient?.department || structuredAssessment?.recommendedDepartment || 'Emergency / ICU'}
                </p>
              </div>
            </div>

            {/* Admission Timeline status */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wider">
                Admission Workflow Stages
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-emerald-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>1. AI Conversational Triage & Symptom Categorization Completed</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-emerald-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>2. Clinical Record Transmitted to Attending Physician Console</span>
                </div>

                {allocatedBedInfo ? (
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 bg-emerald-100/70 p-3 rounded-xl border border-emerald-300">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                      <div>
                        <span>3. Bed & Room Allocation Confirmed</span>
                        <div className="text-[11px] font-normal text-emerald-900 mt-0.5">
                          {allocatedBedInfo.roomNumber} • Bed {allocatedBedInfo.bedNumber} ({allocatedBedInfo.ward}, {allocatedBedInfo.floor})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-200/90 px-2 py-0.5 rounded shrink-0">
                      Assigned
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-blue-900 bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] animate-pulse">
                        3
                      </div>
                      <div>
                        <span>3. Bed Allocation & Nursing Ward Preparation</span>
                        <div className="text-[11px] text-slate-500 font-normal">
                          Attending physician is assigning designated room and bed
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateAllocation}
                      disabled={isSimulatingAllocation}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSimulatingAllocation ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Allocating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Simulate Bed Allocation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowWaitingRoom(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Back to Triage Chat
              </button>

              <button
                onClick={openAssessmentSheetModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Assessment Sheet</span>
              </button>

              {!allocatedBedInfo && (
                <button
                  type="button"
                  onClick={handleSimulateAllocation}
                  disabled={isSimulatingAllocation}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSimulatingAllocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BedIcon className="w-4 h-4" />
                  )}
                  <span>Simulate Bed Allocation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assessment Sheet Print & Clinical Authorization Modal */}
      <AssessmentSheetModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        data={currentSheetData}
        availableDoctors={availableDoctors}
      />
    </div>
  );
};
