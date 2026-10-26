import { useEffect, useRef, useState } from 'react'
import { Icon, Logo } from '../../components/customer_ui.jsx'

function getTableNumber(value) {
  const qrValue = value.trim()
  if (!qrValue) return ''

  try {
    const url = new URL(qrValue)
    const table = url.searchParams.get('table')
      || url.searchParams.get('tableNumber')
      || url.searchParams.get('table_number')
    if (table) return table.trim()

    const pathMatch = url.pathname.match(/\/table\/([a-z0-9-]+)\/?$/i)
    if (pathMatch) return pathMatch[1]
  } catch {

  }

  const match = qrValue.match(/^(?:table\s*)?(?:#|:|-)?\s*([a-z0-9-]{1,12})$/i)
  return match?.[1] || ''
}

export default function CosTableScanner({ onTableFound, onBack }) {
  const videoRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [tableInput, setTableInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isScanning) return undefined

    const video = videoRef.current
    let active = true
    let stream
    let frameId

    async function startScanner() {
      if (!('BarcodeDetector' in window)) {
        setError('QR scanning is not supported in this browser. Enter the table number from the QR code instead.')
        setIsScanning(false)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is unavailable. Open this page over HTTPS or enter the table number manually.')
        setIsScanning(false)
        return
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
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
              const barcodes = await detector.detect(video)
              const decodedTable = barcodes.map((barcode) => getTableNumber(barcode.rawValue)).find(Boolean)
              if (decodedTable) {
                active = false
                onTableFound(decodedTable)
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
  }, [isScanning, onTableFound])

  function submitTable(event) {
    event.preventDefault()
    const table = getTableNumber(tableInput)
    if (!table) {
      setError('Enter a valid table number or scan the table QR code.')
      return
    }
    onTableFound(table)
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
