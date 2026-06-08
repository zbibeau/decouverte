/* ============================================================
   FrontPreview — restitution FIDÈLE du front MadeForMed.
   Fond crème, hero violet (purple-400 + badge primary-900),
   cards blanches rounded-3xl, Steradian. Gère conditional
   (then/else) + toolContentSection. Piloté par les props.
   ============================================================ */
const { useRef: _useRef, useEffect: _useEffect } = React;

function PvCheck({ children }) {
  return <li className="pv-li"><span className="pv-check">✓</span><span>{children}</span></li>;
}

function PvBlock({ block, selectedId, registerRef, branch, onToggleBranch }) {
  const t = block.type, p = block.payload || {};
  const sel = block.id === selectedId;
  const ref = _useRef(null);
  _useEffect(() => { registerRef(block.id, ref.current); });

  let inner = null;
  if (t === 'heroTitle') {
    inner = (
      <div className="pv-hero">
        <div className="pv-hero-badge">{p.number ?? 1}</div>
        <div className="pv-hero-title">{p.title || 'Titre du chapitre'}</div>
      </div>
    );
  } else if (t === 'text') {
    inner = <div className="pv-text" dangerouslySetInnerHTML={{ __html: p.html || 'Texte…' }} />;
  } else if (t === 'keyPointsCard') {
    inner = (
      <div className="pv-card-white">
        <div className="pv-card-head"><span className="pv-ico pv-ico-ocre">✦</span><span className="pv-card-eyebrow">Points clés</span></div>
        {p.title && <div className="pv-card-title2">{p.title}</div>}
        <ul className="pv-list">
          {(p.items || []).map((it, i) => <PvCheck key={i}>{it}</PvCheck>)}
          {(!p.items || !p.items.length) && <li className="pv-empty">Aucun point pour l’instant</li>}
        </ul>
      </div>
    );
  } else if (t === 'toolContentSection') {
    inner = (
      <div className="pv-tcs">
        <div className="pv-tcs-title">{p.title || 'Titre de la section'}</div>
        {p.subtitle && <div className="pv-tcs-sub">{p.subtitle}</div>}
        <div className="pv-card-white" style={{ marginTop: 14 }}>
          <div className="pv-card-head"><span className="pv-ico pv-ico-ocre">✓</span><span className="pv-card-eyebrow">{p.advantageTitle || 'Les avantages'}</span></div>
          <ul className="pv-list">
            {(p.advantagePoints || []).map((it, i) => <PvCheck key={i}>{it}</PvCheck>)}
            {(!p.advantagePoints || !p.advantagePoints.length) && <li className="pv-empty">Aucun avantage listé</li>}
          </ul>
        </div>
        {(p.children || []).map((c) => <div key={c.id} style={{ marginTop: 12 }}><PvBlock block={c} selectedId={selectedId} registerRef={registerRef} branch={branch} onToggleBranch={onToggleBranch} /></div>)}
      </div>
    );
  } else if (t === 'faqCard') {
    inner = (
      <div className="pv-card-white pv-faq">
        {(p.questions || []).map((qa, i) => <div className="pv-faq-q" key={i}><span>＋</span>{qa.q}</div>)}
        {(!p.questions || !p.questions.length) && <div className="pv-empty" style={{ padding: 6 }}>Aucune question</div>}
      </div>
    );
  } else if (t === 'video') {
    inner = (
      <div className="pv-video"><div className="pv-play">▶</div><div className="pv-video-cap">{p.caption || 'Vidéo'}</div></div>
    );
  } else if (t === 'form') {
    inner = (
      <div className="pv-card-white pv-form">
        <div className="pv-card-title2">{p.title || 'Formulaire'}</div>
        {(p.fields || []).map((f, i) => <div className="pv-field" key={i}>{f}</div>)}
        <div className="pv-cta">{p.cta || 'Continuer'}</div>
      </div>
    );
  } else if (t === 'card') {
    inner = (
      <div className="pv-card-glass">
        {p.title && <div className="pv-card-title">{p.title}</div>}
        <div className="pv-card-body">
          {(p.children || []).map((c) => <PvBlock key={c.id} block={c} selectedId={selectedId} registerRef={registerRef} branch={branch} onToggleBranch={onToggleBranch} />)}
          {(!p.children || !p.children.length) && <div className="pv-empty" style={{ color: '#fff' }}>Card vide</div>}
        </div>
      </div>
    );
  } else if (t === 'conditional') {
    const active = (branch && branch[block.id]) || 'then';
    const cond = p.condition || {};
    const list = active === 'then' ? (p.then || []) : (p.else || []);
    inner = (
      <div className="pv-cond">
        <button className="pv-cond-chip" onClick={(e) => { e.stopPropagation(); onToggleBranch && onToggleBranch(block.id); }}
          title="Aperçu : basculer la branche affichée">
          <span className="pv-cond-rule">si {cond.variable} {cond.op} {String(cond.value)}</span>
          <span className="pv-cond-branch">{active === 'then' ? 'Alors' : 'Sinon'} ⇄</span>
        </button>
        {list.map((c) => <PvBlock key={c.id} block={c} selectedId={selectedId} registerRef={registerRef} branch={branch} onToggleBranch={onToggleBranch} />)}
        {!list.length && <div className="pv-empty">Branche {active === 'then' ? 'Alors' : 'Sinon'} vide</div>}
      </div>
    );
  }

  return <div ref={ref} className={'pv-block' + (sel ? ' pv-sel' : '')} data-pid={block.id}>{inner}</div>;
}

function FrontPreview({ doc, selectedId, branch, onToggleBranch }) {
  const scrollRef = _useRef(null);
  const refs = _useRef({});
  const registerRef = (id, el) => { if (el) refs.current[id] = el; };

  _useEffect(() => {
    const cont = scrollRef.current;
    const el = selectedId && refs.current[selectedId];
    if (!cont || !el) return;
    const cTop = cont.getBoundingClientRect().top;
    const eTop = el.getBoundingClientRect().top;
    const target = cont.scrollTop + (eTop - cTop) - 70;
    cont.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [selectedId, doc]);

  return (
    <div className="pv-scroll" ref={scrollRef}>
      <div className="pv-eyebrow">{doc.parcours} · Chapitre {String(doc.chapter.number).padStart(2, '0')}</div>
      {doc.blocks.map((b) => <PvBlock key={b.id} block={b} selectedId={selectedId} registerRef={registerRef} branch={branch} onToggleBranch={onToggleBranch} />)}
      <div className="pv-end">Fin du chapitre · Prendre rendez-vous</div>
    </div>
  );
}

Object.assign(window, { FrontPreview, PvBlock });
