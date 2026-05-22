import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, CheckCircle2, Cpu } from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import { crowdFromCount, crowdMeta } from '@/data';

const SCAN_INTERVAL_MS = 10000;

export default function AICamScanner({ busId, maxCapacity = 50, onCrowdUpdate, autoEnabled = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const countTimerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');

  const captureDataUrl = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setError('');
    try {
      const imageDataUrl = await captureDataUrl();
      if (!imageDataUrl) throw new Error('Camera is not ready yet.');
      const result = await backend.ai.analyzePassengerImage({ imageDataUrl, maxCapacity });
      const count = Math.max(0, Number(result?.count || 0));
      const crowdLevel = result?.crowd_level || crowdFromCount(count, maxCapacity);
      const meta = crowdMeta[crowdLevel] || crowdMeta.available;
      setLastResult({ count, relevant: result?.relevant !== false, crowdLevel, meta });
      setCountdown(10);
      if (busId) {
        await backend.entities.Bus.update(busId, { passenger_count: count, crowd_level: crowdLevel });
      }
      onCrowdUpdate?.(crowdLevel, count);
    } catch (err) {
      setError(err.message || 'Scan failed. Will retry.');
    } finally {
      setScanning(false);
    }
  }, [busId, maxCapacity, onCrowdUpdate, scanning]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
    } catch {
      setError('Camera access denied. Please allow camera permission.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(scanTimerRef.current);
    clearInterval(countTimerRef.current);
    setActive(false);
    setScanning(false);
    setCountdown(10);
  }, []);

  useEffect(() => {
    if (!active || !autoEnabled) return undefined;
    const warmup = setTimeout(captureAndAnalyze, 1500);
    scanTimerRef.current = setInterval(captureAndAnalyze, SCAN_INTERVAL_MS);
    countTimerRef.current = setInterval(() => setCountdown((n) => (n <= 1 ? 10 : n - 1)), 1000);
    return () => {
      clearTimeout(warmup);
      clearInterval(scanTimerRef.current);
      clearInterval(countTimerRef.current);
    };
  }, [active, autoEnabled, captureAndAnalyze]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <section className="panel camera-panel">
      <div className="panel-head">
        <div className="inline-title"><Cpu size={17} /> AI Crowd Scanner</div>
        <button className={active ? 'danger-btn' : 'primary-btn'} onClick={active ? stopCamera : startCamera}>
          {active ? <CameraOff size={16} /> : <Camera size={16} />}
          {active ? 'Stop' : 'Start Camera'}
        </button>
      </div>
      <div className="camera-box">
        <video ref={videoRef} muted playsInline autoPlay />
        <canvas ref={canvasRef} hidden />
        {!active && <div className="camera-empty"><Camera size={38} /><span>Camera off</span></div>}
        {scanning && <div className="scan-flash" />}
        {active && <span className="count-chip">{scanning ? 'Scanning...' : `Next scan ${countdown}s`}</span>}
      </div>
      <div className="result-row">
        {error && <span className="error-text"><AlertCircle size={15} /> {error}</span>}
        {!error && lastResult && (
          <>
            <span><CheckCircle2 size={16} /> <b>{lastResult.count}</b> passengers</span>
            <span className="crowd-pill" style={{ color: lastResult.meta.color, borderColor: lastResult.meta.color }}>
              {lastResult.meta.label}
            </span>
          </>
        )}
        {!error && !lastResult && <span>Start the camera to count passengers every 10 seconds.</span>}
      </div>
    </section>
  );
}
