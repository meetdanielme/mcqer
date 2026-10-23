import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { artifactDocument } from './artifacts.js';

export function QuestionArtifact({ artifact }) {
  const dialog = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const document = useMemo(() => artifactDocument(artifact.html), [artifact.html]);
  useEffect(() => { if (expanded) dialog.current.showModal(); }, [expanded]);
  const frame = <iframe title={artifact.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document}/>;
  return <figure className="question-artifact">
    <figcaption>{artifact.title}</figcaption>
    {frame}
    <button type="button" className="plain-link" onClick={() => setExpanded(true)}>Enlarge chart</button>
    <dialog ref={dialog} className="artifact-dialog" aria-label="Enlarged chart" onClose={() => setExpanded(false)}>
      <div className="image-dialog-heading"><h2>{artifact.title}</h2><button type="button" className="icon-button" aria-label="Close chart" autoFocus onClick={() => dialog.current.close()}><X size={24}/></button></div>
      {expanded && frame}
    </dialog>
  </figure>;
}
