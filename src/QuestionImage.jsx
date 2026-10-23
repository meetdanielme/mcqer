import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { imageUrl } from './images.js';

export function QuestionImage({ image }) {
  const dialog = useRef(null);
  const [failed, setFailed] = useState(false);
  const src = imageUrl(image.src, import.meta.env.BASE_URL);
  if (failed) return <div className="image-error" role="alert">Image unavailable: {image.alt}. Try reloading online before answering this question.</div>;
  return <figure className="question-image">
    <button type="button" className="image-thumbnail" aria-label="Enlarge question image" onClick={() => dialog.current.showModal()}><img src={src} alt={image.alt} onError={() => setFailed(true)}/><span>Tap or click to enlarge</span></button>
    <dialog ref={dialog} className="image-dialog" aria-label="Enlarged question image" onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      <div className="image-dialog-heading"><p>{image.alt}</p><button type="button" className="icon-button" aria-label="Close image" autoFocus onClick={() => dialog.current.close()}><X size={24}/></button></div>
      <div className="image-zoom-scroll" tabIndex={0} aria-label="Scroll to explore the full-size image"><img src={src} alt={image.alt}/></div>
      <p className="image-zoom-hint">Scroll to explore the full-size image.</p>
    </dialog>
  </figure>;
}
