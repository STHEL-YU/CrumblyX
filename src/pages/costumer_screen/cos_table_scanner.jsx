import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Icon, Logo } from '../../components/customer_ui.jsx'
import { getTableDestination } from './table_qr.js'

export default function CosTableScanner({ onTableFound, onBack }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onTableFoundRef = useRef(onTableFound)
  const [isScanning, setIsScanning] = useState(false)
  const [tableInput, setTableInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    onTableFoundRef.current = onTableFound
  }, [onTableFound])

  useEffect(() => {
    if (!isScanning) return undefined

    const video = videoRef.current
    let active = true
    let stream
    let frameId
    const detector = 'BarcodeDetector' in window
      ? new window.BarcodeDetector({ formats: ['qr_code'] })
      : null

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is unavailable. Open this page over HTTPS or enter the table number manually.')
        setIsScanning(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        if (!video) {
          throw new Error('The camera preview is unavailable.')
        }
        video.srcObject = stream
        await video.play()

        async function scanFrame() {
          if (!active) return
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              let value = ''
              if (detector) {
                const barcodes = await detector.detect(video)
                value = barcodes[0]?.rawValue || ''
              } else {
                const canvas = canvasRef.current
                const context = canvas?.getContext('2d', { willReadFrequently: true })
                if (canvas && context) {
                  canvas.width = video.videoWidth
                  canvas.height = video.videoHeight
                  context.drawImage(video, 0, 0, canvas.width, canvas.height)
                  const image = context.getImageData(0, 0, canvas.width, canvas.height)
                  value = jsQR(image.data, image.width, image.height)?.data || ''
                }
              }
              const destination = getTableDestination(value)
              if (destination) {
                active = false
                onTableFoundRef.current(destination)
                return
              }
            } catch {
              if (active) setError('Unable to read the QR code. Adjust the camera and try again.')
            }
          }
          if (active) frameId = window.requestAnimationFrame(scanFrame)
        }

        frameId = window.requestAnimationFrame(scanFrame)
      } catch (cameraError) {
        if (!active) return
        const message = cameraError?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or enter the table number manually.'
          : cameraError?.name === 'NotFoundError'
            ? 'No camera was found on this device. Enter the table number manually.'
            : 'Could not start the camera. Check camera access or enter the table number manually.'
        setError(message)
        setIsScanning(false)
      }
    }

    startScanner()

    return () => {
      active = false
      if (frameId) window.cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [isScanning])

  function submitTable(event) {
    event.preventDefault()
    const destination = getTableDestination(tableInput)
    if (!destination) {
      setError('Enter a valid table number or scan the table QR code.')
      return
    }
    onTableFoundRef.current(destination)
  }

  return (
    <>
      <header className="auth-header">
        <button className="scanner-back" type="button" onClick={onBack}>‹ Back</button>
        <div className="auth-brand"><Logo small /><span>CrumblyX</span></div>
      </header>
      <section className="table-scanner-card">
        <span className="scanner-icon"><Icon name="qr" size={30} /></span>
        <h1>Scan your table QR code</h1>
        <p className="scanner-description">Point your camera at the QR code on the table to continue to the menu.</p>
        <div className={`scanner-preview ${isScanning ? 'scanning' : ''}`}>
          {isScanning ? (
            <>
              <video ref={videoRef} className="scanner-video" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <span className="scanner-frame" aria-hidden="true"><i /></span>
            </>
          ) : (
            <div className="scanner-placeholder"><Icon name="qr" size={43} /><span>Your camera preview will appear here</span></div>
          )}
        </div>
        {error && <p className="scanner-error" role="alert">{error}</p>}
        <button className="auth-submit scanner-start" type="button" disabled={isScanning} onClick={() => { setError(''); setIsScanning(true) }}>
          {isScanning ? 'Scanning...' : 'Open Camera to Scan'}
        </button>
        <div className="scanner-divider"><span />or enter table number<span /></div>
        <form className="table-number-form" onSubmit={submitTable}>
          <label className="visually-hidden" htmlFor="table-number">Table number</label>
          <input
            id="table-number"
            value={tableInput}
            onChange={(event) => setTableInput(event.target.value)}
            placeholder="Enter table number"
            autoComplete="off"
          />
          <button type="submit" aria-label="Continue to menu"><Icon name="arrow" size={19} /></button>
        </form>
      </section>
      <p className="auth-wordmark">CrumblyX</p>
    </>
  )
}
