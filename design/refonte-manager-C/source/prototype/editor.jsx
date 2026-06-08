/* ============================================================
   Studio editor — Direction C. Version étendue.
   • Helpers d'arbre généralisés (card.children, conditional.then/else,
     toolContentSection.children) — un seul modèle de bloc, récursif.
   • Drag-and-drop entre frères (racine + imbriqué).
   • Inspecteurs : Conditionnel (builder + simulateur de branche) & Section outil.
   • Mode « branché » : messages preview:* live (point d'intégration).
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---------- conteneurs d'enfants par type ---------- */
function childContainers(b) {
  if (b.type === 'card') return [{ field: 'children', label: 'Sous-blocs' }];
  if (b.type === 'toolContentSection') return [{ field: 'children', label: 'Sous-blocs' }];
  if (b.type === 'conditional') return [{ field: 'then', label: 'Alors' }, { field: 'else', label: 'Sinon' }];
  return [];
}
const getList = (b, field) => (b.payload && b.payload[field]) || [];

/* ---------- helpers arbre (immutables, récursifs) ---------- */
function findBlock(list, id) {
  for (const b of list) {
    if (b.id === id) return b;
    for (const { field } of childContainers(b)) { const r = findBlock(getList(b, field), id); if (r) return r; }
  }
  return null;
}
function mapChildren(b, fn) {
  const conts = childContainers(b);
  if (!conts.length) return b;
  let nb = b;
  for (const { field } of conts) {
    const cur = getList(nb, field);
    const next = fn(cur, field);
    if (next !== cur) nb = { ...nb, payload: { ...nb.payload, [field]: next } };
  }
  return nb;
}
function updIn(list, id, fn) {
  return list.map((b) => (b.id === id ? fn(b) : mapChildren(b, (cur) => updIn(cur, id, fn))));
}
function removeFrom(list, id) {
  return list.filter((b) => b.id !== id).map((b) => mapChildren(b, (cur) => removeFrom(cur, id)));
}
function insertInto(list, containerId, field, block) {
  return list.map((b) => {
    if (b.id === containerId) return { ...b, payload: { ...b.payload, [field]: [...getList(b, field), block] } };
    return mapChildren(b, (cur) => insertInto(cur, containerId, field, block));
  });
}
function moveIn(list, id, dir) {
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) {
    const j = i + dir; if (j < 0 || j >= list.length) return list;
    const copy = list.slice(); [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
  }
  return list.map((b) => mapChildren(b, (cur) => moveIn(cur, id, dir)));
}
function reorderRelative(list, dragId, targetId, before) {
  const hasD = list.some((b) => b.id === dragId), hasT = list.some((b) => b.id === targetId);
  if (hasD && hasT) {
    const dragged = list.find((b) => b.id === dragId);
    const items = list.filter((b) => b.id !== dragId);
    const ti = items.findIndex((b) => b.id === targetId);
    items.splice(before ? ti : ti + 1, 0, dragged);
    return items;
  }
  return list.map((b) => mapChildren(b, (cur) => reorderRelative(cur, dragId, targetId, before)));
}
function flatten(list, depth = 0, acc = []) {
  for (const b of list) { acc.push({ b, depth }); for (const { field } of childContainers(b)) flatten(getList(b, field), depth + 1, acc); }
  return acc;
}
function summarize(b) {
  const p = b.payload || {};
  switch (b.type) {
    case 'heroTitle': return p.title || 'Titre';
    case 'text': return (p.html || '').replace(/<[^>]+>/g, '').slice(0, 60) || 'Texte vide';
    case 'keyPointsCard': return p.title || 'Key points';
    case 'faqCard': return (p.questions && p.questions[0] && p.questions[0].q) || 'FAQ';
    case 'toolContentSection': return p.title || 'Section outil';
    case 'video': return p.caption || p.src || 'Vidéo';
    case 'card': return (p.title || 'Card') + ' · ' + (getList(b, 'children').length) + ' sous-bloc' + (getList(b, 'children').length > 1 ? 's' : '');
    case 'conditional': { const c = p.condition || {}; return 'si ' + c.variable + ' ' + c.op + ' ' + c.value; }
    case 'form': return p.title || 'Formulaire';
    default: return BLOCK_TYPES[b.type].label;
  }
}

/* ---------- contrôles de champ ---------- */
function Field({ label, children }) { return <label className="fld"><span className="fld-l">{label}</span>{children}</label>; }
function TextInput({ value, onChange, mono }) { return <input className={'fld-in' + (mono ? ' mono' : '')} value={value || ''} onChange={(e) => onChange(e.target.value)} />; }
function AreaInput({ value, onChange }) { return <textarea className="fld-in fld-area" value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} />; }
function SelectInput({ value, options, onChange }) {
  return <select className="fld-in" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
}
function ListInput({ items, onChange, placeholder }) {
  const arr = items || [];
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const move = (from, to) => {
    if (from == null || to == null || from === to) return;
    const c = arr.slice(); const [m] = c.splice(from, 1);
    c.splice(from < to ? to - 1 : to, 0, m); onChange(c);
  };
  return (
    <div className="listin">
      {arr.map((it, i) => (
        <div key={i}
          className={'listin-row' + (drag === i ? ' dragging' : '') + (over === i && drag !== null && drag !== i ? ' over' : '')}
          onDragOver={(e) => { if (drag !== null) { e.preventDefault(); setOver(i); } }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => { e.preventDefault(); move(drag, i); setDrag(null); setOver(null); }}>
          <input className="fld-in" value={it} onChange={(e) => { const c = arr.slice(); c[i] = e.target.value; onChange(c); }} />
          <button className="icbtn danger" title="Retirer" onClick={() => onChange(arr.filter((_, k) => k !== i))}>✕</button>
          <span className="listin-grip" draggable onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }} title="Glisser pour réordonner">⠿</span>
        </div>
      ))}
      <button className="listin-add" onClick={() => onChange([...arr, placeholder || 'Nouvel élément'])}>+ Ajouter</button>
    </div>
  );
}

/* ---------- builder de condition ---------- */
function ConditionBuilder({ block, api }) {
  const cond = block.payload.condition || { variable: VARIABLES[0].key, op: '=', value: '' };
  const v = VARIABLES.find((x) => x.key === cond.variable);
  const set = (patch) => api.setField(block.id, 'condition', { ...cond, ...patch });
  const branch = (api.state.branch && api.state.branch[block.id]) || 'then';
  return (
    <div className="condbox">
      <div className="cond-grid">
        <Field label="Variable"><SelectInput value={cond.variable} options={VARIABLES.map((x) => x.key)} onChange={(val) => set({ variable: val, value: (VARIABLES.find((x) => x.key === val).options || [''])[0] })} /></Field>
        <Field label="Opérateur"><SelectInput value={cond.op} options={OPERATORS} onChange={(val) => set({ op: val })} /></Field>
        <Field label="Valeur">{v && v.options ? <SelectInput value={String(cond.value)} options={v.options} onChange={(val) => set({ value: val })} /> : <TextInput value={String(cond.value)} onChange={(val) => set({ value: val })} />}</Field>
      </div>
      <div className="branch-toggle">
        <span className="bt-l">Aperçu de la branche</span>
        <div className="seg">
          <button className={branch === 'then' ? 'on' : ''} onClick={() => api.setBranch(block.id, 'then')}>Alors</button>
          <button className={branch === 'else' ? 'on' : ''} onClick={() => api.setBranch(block.id, 'else')}>Sinon</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- inspecteur ---------- */
function Inspector({ block, api }) {
  const p = block.payload || {};
  const set = (k, v) => api.setField(block.id, k, v);
  switch (block.type) {
    case 'heroTitle':
      return (<><Field label="Numéro"><TextInput value={String(p.number ?? '')} onChange={(v) => set('number', v.replace(/\D/g, '') || '')} mono /></Field>
        <Field label="Titre"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field></>);
    case 'text':
      return <Field label="Texte"><AreaInput value={p.html} onChange={(v) => set('html', v)} /></Field>;
    case 'keyPointsCard':
      return (<><Field label="Titre"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field>
        <Field label="Points clés"><ListInput items={p.items} onChange={(v) => set('items', v)} placeholder="Nouveau point" /></Field></>);
    case 'faqCard':
      return <Field label="Questions"><ListInput items={(p.questions || []).map((q) => q.q)} onChange={(v) => set('questions', v.map((q, i) => ({ q, a: (p.questions[i] && p.questions[i].a) || '' })))} placeholder="Nouvelle question" /></Field>;
    case 'toolContentSection':
      return (<><Field label="Titre"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field>
        <Field label="Sous-titre"><TextInput value={p.subtitle} onChange={(v) => set('subtitle', v)} /></Field>
        <Field label="Titre des avantages"><TextInput value={p.advantageTitle} onChange={(v) => set('advantageTitle', v)} /></Field>
        <Field label="Avantages"><ListInput items={p.advantagePoints} onChange={(v) => set('advantagePoints', v)} placeholder="Nouvel avantage" /></Field></>);
    case 'video':
      return (<><Field label="Source"><TextInput value={p.src} onChange={(v) => set('src', v)} mono /></Field>
        <Field label="Légende"><TextInput value={p.caption} onChange={(v) => set('caption', v)} /></Field></>);
    case 'form':
      return (<><Field label="Titre"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field>
        <Field label="Champs"><ListInput items={p.fields} onChange={(v) => set('fields', v)} placeholder="Nouveau champ" /></Field>
        <Field label="Bouton"><TextInput value={p.cta} onChange={(v) => set('cta', v)} /></Field></>);
    case 'card':
      return <Field label="Titre de la card"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field>;
    case 'conditional':
      return <ConditionBuilder block={block} api={api} />;
    default: return null;
  }
}

/* ---------- carte de bloc (récursive) ---------- */
function BlockCard({ block, depth, isFirst, isLast, api, state }) {
  const meta = BLOCK_TYPES[block.type];
  const sel = state.selectedId === block.id;
  const open = state.expanded.has(block.id);
  const justAdded = state.justAdded === block.id;
  const conts = childContainers(block);
  const dt = state.dropTarget;
  const dropBefore = dt && dt.id === block.id && dt.before && state.dragId !== block.id;
  const dropAfter = dt && dt.id === block.id && !dt.before && state.dragId !== block.id;
  const cls = ['blk', depth > 0 ? 'blk-nested' : '', sel ? 'sel' : '', justAdded ? 'added' : '',
    state.dragId === block.id ? 'dragging' : '', dropBefore ? 'drop-before' : '', dropAfter ? 'drop-after' : ''].join(' ');
  return (
    <div className={cls}
      onDragOver={(e) => api.dragOver(e, block.id)}
      onDrop={(e) => api.drop(e, block.id)}>
      <div className="blk-head" onClick={() => api.select(block.id)}>
        <span className="blk-grip" draggable onDragStart={(e) => api.dragStart(e, block.id)} onDragEnd={api.dragEnd} onClick={(e) => e.stopPropagation()} title="Glisser pour réordonner">⠿</span>
        <button className="blk-chev" onClick={(e) => { e.stopPropagation(); api.toggle(block.id); }} title={open ? 'Replier' : 'Déplier'}>{open ? '▾' : '▸'}</button>
        <span className="blk-thumb" aria-hidden="true">{meta.glyph}</span>
        <span className="blk-meta">
          <span className="blk-eyebrow">{meta.label}{depth > 0 ? ' · sous-bloc' : ''}</span>
          <span className="blk-title">{summarize(block)}</span>
        </span>
        <span className="blk-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icbtn" disabled={isFirst} onClick={() => api.move(block.id, -1)} title="Monter">↑</button>
          <button className="icbtn" disabled={isLast} onClick={() => api.move(block.id, 1)} title="Descendre">↓</button>
          <button className="icbtn danger" onClick={() => api.remove(block.id)} title="Supprimer">🗑</button>
        </span>
      </div>
      {open && (
        <div className="blk-body">
          <Inspector block={block} api={api} />
          {conts.map(({ field, label }) => (
            <div className="subzone" key={field}>
              <div className="subzone-h">{block.type === 'conditional' ? 'Branche ' : ''}{label}{block.type !== 'conditional' ? ' de la ' + meta.label.toLowerCase() : ''}</div>
              <BlockList blocks={getList(block, field)} depth={depth + 1} api={api} state={state} />
              <button className="add-sub" onClick={() => api.openGallery(block.id, field)}>＋ Ajouter {block.type === 'conditional' ? 'dans « ' + label + ' »' : 'un sous-bloc'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockList({ blocks, depth, api, state }) {
  if (!blocks.length && depth > 0) return <div className="sub-empty">Vide — ajoutez un premier bloc.</div>;
  return blocks.map((b, i) => (
    <BlockCard key={b.id} block={b} depth={depth} isFirst={i === 0} isLast={i === blocks.length - 1} api={api} state={state} />
  ));
}

/* ---------- galerie d'ajout ---------- */
function AddGallery({ target, onPick, onClose }) {
  const allowed = target ? NESTABLE : Object.keys(BLOCK_TYPES);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div>
            <div className="gm-title">{target ? 'Ajouter un sous-bloc' : 'Ajouter un bloc'}</div>
            <div className="gm-sub">{target ? 'Il se posera ici, ouvert et sélectionné.' : 'Choisissez un type — l’icône le résume.'}</div>
          </div>
          <button className="icbtn" onClick={onClose} title="Fermer">✕</button>
        </div>
        <div className="gm-body">
          {CATEGORIES.map((cat) => {
            const types = Object.keys(BLOCK_TYPES).filter((t) => BLOCK_TYPES[t].cat === cat && allowed.includes(t));
            if (!types.length) return null;
            return (
              <div className="gm-cat" key={cat}>
                <div className="gm-cat-l">{cat}</div>
                <div className="gm-grid">
                  {types.map((t) => (
                    <button className="gm-item" key={t} onClick={() => onPick(t)}>
                      <span className="gm-thumb">{BLOCK_TYPES[t].glyph}</span>
                      <span className="gm-name">{BLOCK_TYPES[t].label}</span>
                      <span className="gm-desc">{BLOCK_TYPES[t].desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- command palette ⌘K ---------- */
function CommandPalette({ doc, onClose, onAdd, onGoto }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  const ql = q.trim().toLowerCase();
  const adds = Object.keys(BLOCK_TYPES).map((t) => ({ t, label: 'Ajouter ' + BLOCK_TYPES[t].label, glyph: BLOCK_TYPES[t].glyph })).filter((a) => !ql || a.label.toLowerCase().includes(ql));
  const gotos = flatten(doc.blocks).map(({ b, depth }) => ({ id: b.id, label: summarize(b), glyph: BLOCK_TYPES[b.type].glyph, depth })).filter((g) => !ql || g.label.toLowerCase().includes(ql));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="cmd-in" placeholder="Ajouter un bloc, aller à…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} />
        <div className="cmd-list">
          {adds.length > 0 && <div className="cmd-sec">Ajouter</div>}
          {adds.map((a) => <button className="cmd-row" key={'a' + a.t} onClick={() => onAdd(a.t)}><span className="cmd-glyph">{a.glyph}</span>{a.label}</button>)}
          {gotos.length > 0 && <div className="cmd-sec">Aller à</div>}
          {gotos.map((g) => <button className="cmd-row" key={'g' + g.id} onClick={() => onGoto(g.id)}><span className="cmd-glyph" style={{ opacity: 0.6 }}>{g.glyph}</span><span style={{ paddingLeft: g.depth * 12 }}>{g.label}</span></button>)}
          {adds.length === 0 && gotos.length === 0 && <div className="cmd-empty">Aucun résultat</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- volet « branché » : point d'intégration preview:* ---------- */
const CLIENT_URL = 'http://localhost:3100';
function ConnectedPane({ doc, selectedId }) {
  const sel = findBlock(doc.blocks, selectedId);
  const messages = sel ? [
    { type: 'preview:setEditedBlock', blockId: sel.id },
    { type: 'preview:setBlockOverride', blockId: sel.id, block: { type: sel.type, payload: sel.payload } },
    { type: 'preview:scrollToBlock', blockId: sel.id, align: 'center' },
  ] : [];
  return (
    <div className="conn">
      <div className="conn-browser">
        <div className="conn-bar"><span className="conn-dots"><i></i><i></i><i></i></span><span className="conn-url">{CLIENT_URL}/preview-block?id={selectedId}&type={sel ? sel.type : '—'}</span></div>
        <div className="conn-screen">
          <div className="conn-status"><span className="conn-off" /> Front non démarré dans cette démo</div>
          <p className="conn-expl">En intégration réelle, ce cadre charge votre <b>renderer SolidJS</b> et reçoit, à chaque sélection / édition, exactement ces messages (protocole existant, non renommé) :</p>
        </div>
      </div>
      <div className="conn-log">
        <div className="conn-log-h">postMessage → iframe</div>
        {messages.length === 0 && <div className="conn-empty">Sélectionnez un bloc…</div>}
        {messages.map((m, i) => (
          <pre className="conn-msg" key={i}>{JSON.stringify(m, null, 1).replace(/\n\s+/g, (s) => s.length > 6 ? '\n  ' : s)}</pre>
        ))}
      </div>
      <div className="conn-note">Aucune donnée n’est dupliquée : le manager pousse le payload en cours d’édition, le front fait le rendu. Le fac-similé est juste là pour la démo hors-ligne.</div>
    </div>
  );
}

/* ---------- application ---------- */
const LS_KEY = 'mfm-studio-c-v2';
function loadState() { try { const raw = localStorage.getItem(LS_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.doc) return s; } } catch (e) {} return null; }

function StudioApp({ tweaks }) {
  const saved = useRef(loadState());
  const [doc, setDoc] = useState(() => (saved.current && saved.current.doc) || JSON.parse(JSON.stringify(SEED)));
  const [selectedId, setSelectedId] = useState(() => (saved.current && saved.current.selectedId) || 'b1');
  const [expanded, setExpanded] = useState(() => new Set((saved.current && saved.current.expanded) || ['b3']));
  const [branch, setBranchState] = useState(() => (saved.current && saved.current.branch) || {});
  const [justAdded, setJustAdded] = useState(null);
  const [gallery, setGallery] = useState(null);
  const [palette, setPalette] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify({ doc, selectedId, expanded: [...expanded], branch })); } catch (e) {} }, [doc, selectedId, expanded, branch]);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const flash = (id) => { setJustAdded(id); setTimeout(() => setJustAdded((c) => (c === id ? null : c)), 1400); };

  const api = {
    state: { selectedId, expanded, justAdded, branch, dragId, dropTarget },
    select: (id) => setSelectedId(id),
    toggle: (id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    move: (id, dir) => setDoc((d) => ({ ...d, blocks: moveIn(d.blocks, id, dir) })),
    remove: (id) => { setDoc((d) => ({ ...d, blocks: removeFrom(d.blocks, id) })); setExpanded((s) => { const n = new Set(s); n.delete(id); return n; }); },
    setField: (id, key, val) => setDoc((d) => ({ ...d, blocks: updIn(d.blocks, id, (b) => ({ ...b, payload: { ...b.payload, [key]: val } })) })),
    openGallery: (target, field) => setGallery({ target: target || null, field: field || 'children' }),
    setBranch: (id, which) => setBranchState((s) => ({ ...s, [id]: which })),
    // drag & drop
    dragStart: (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch (x) {} },
    dragEnd: () => { setDragId(null); setDropTarget(null); },
    dragOver: (e, id) => {
      if (!dragId || id === dragId) return;
      e.preventDefault(); e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      setDropTarget((dt) => (dt && dt.id === id && dt.before === before ? dt : { id, before }));
    },
    drop: (e, id) => {
      e.preventDefault(); e.stopPropagation();
      if (dragId && id !== dragId && dropTarget) setDoc((d) => ({ ...d, blocks: reorderRelative(d.blocks, dragId, id, dropTarget.before) }));
      setDragId(null); setDropTarget(null);
    },
  };

  function addBlock(type, target, field) {
    const blk = makeBlock(type);
    setDoc((d) => target ? { ...d, blocks: insertInto(d.blocks, target, field || 'children', blk) } : { ...d, blocks: [...d.blocks, blk] });
    if (target) setExpanded((s) => new Set(s).add(target));
    setExpanded((s) => new Set(s).add(blk.id));
    setSelectedId(blk.id); flash(blk.id);
  }

  const state = { selectedId, expanded, justAdded, branch, dragId, dropTarget };
  const sel = findBlock(doc.blocks, selectedId);
  const connected = tweaks.previewMode === 'Branché';

  return (
    <div className={'studio density-' + (tweaks.density || 'regular') + (tweaks.device === false ? ' no-device' : '')}>
      <aside className="rail">
        <div className="rail-top"><span className="rail-sq">M</span><span className="rail-word">Manager</span></div>
        <div className="rail-sec">Parcours</div>
        <div className="rail-item active"><span className="rail-dot" style={{ background: '#c6a8f5' }}>D</span>Démo ventes</div>
        <div className="rail-item"><span className="rail-dot" style={{ background: '#ffd8a5' }}>O</span>Onboarding</div>
        <div className="rail-item"><span className="rail-dot" style={{ background: '#bdd9ff' }}>T</span>Téléconsult</div>
        <div className="rail-foot">vivien@madeformed.fr</div>
      </aside>

      <main className="canvas">
        <div className="topbar">
          <div className="tb-title">{doc.parcours} <span className="tb-sep">/</span> Ch. {String(doc.chapter.number).padStart(2, '0')}</div>
          <button className="cmd-pill" onClick={() => setPalette(true)}>⌘ Ajouter, chercher, aller à… <span className="kbd">⌘K</span></button>
          <button className="btn-add" onClick={() => setGallery({ target: null })}>＋ Ajouter un bloc</button>
        </div>
        <div className="stack">
          <BlockList blocks={doc.blocks} depth={0} api={api} state={state} />
          <button className="stack-add" onClick={() => setGallery({ target: null })}>＋ Ajouter un bloc en fin de chapitre</button>
        </div>
      </main>

      {tweaks.device !== false && (
        <aside className="device">
          <div className="device-label"><span className="live-dot" /> {connected ? 'Mode branché · preview:*' : 'Aperçu live · fac-similé'}</div>
          {connected ? <ConnectedPane doc={doc} selectedId={selectedId} /> : (
            <React.Fragment>
              <div className="phone">
                <div className="phone-notch" />
                <FrontPreview doc={doc} selectedId={selectedId} branch={branch} onToggleBranch={(id) => setBranchState((s) => ({ ...s, [id]: (s[id] === 'else' ? 'then' : 'else') }))} />
              </div>
              <div className="device-hint">{sel ? <>Sélection : <b>{BLOCK_TYPES[sel.type].label}</b> — éditez à gauche, le rendu suit.</> : 'Cliquez un bloc pour le voir ici.'}</div>
            </React.Fragment>
          )}
        </aside>
      )}

      {gallery && <AddGallery target={gallery.target} onClose={() => setGallery(null)} onPick={(t) => { addBlock(t, gallery.target, gallery.field); setGallery(null); }} />}
      {palette && <CommandPalette doc={doc} onClose={() => setPalette(false)} onAdd={(t) => { addBlock(t, null); setPalette(false); }} onGoto={(id) => { setSelectedId(id); setExpanded((s) => new Set(s).add(id)); setPalette(false); }} />}
    </div>
  );
}

Object.assign(window, { StudioApp });
