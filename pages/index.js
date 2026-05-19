import { useState, useEffect } from 'react';
import Head from 'next/head';

const STAFF = [
  "Nicole Campbell","Brett Campbell","Dennis Rozanic","David Webb","Matthew Webb",
  "Kyle Davidson","Aaron Mellington","Stuart Wallis","Benjamin Keen","David Epps",
  "Lester Aguinaldo","Rodney Slow","Kristy-Anne Campbell","Susan Stevens","Quentin Cook",
  "Gillian Blunsom","Everad Seller","Prodromos Daglaroglou","Kalapu Gamage","Yohan Gishan Perera",
  "Mark Arena","Ofer Notkovitch","Stuart Wallis (DRC)","Callum Donnelly","Chipo Hwani",
  "Camdyn Gaskin","Troy Henderson","Rangana Gunasekara","Luke Ryan","Matthew Benstead",
  "Erol Savas","Jade Martinet-Andrieux","Josiah Simpson","Kresimir Vrabec","Adam Moran",
  "Jozef Beska","Brian Joseph","Jared Foy","Mick Thompson","Jennifer Campbell",
].sort();

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:true });
};

const toLocalInput = (date) => {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Home() {
  const [visitors, setVisitors] = useState([]);
  const [tab, setTab] = useState('register');
  const [form, setForm] = useState({ name:'', surname:'', company:'', checkIn:toLocalInput(new Date()), visitingWhom:'' });
  const [visitingOther, setVisitingOther] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printVisitor, setPrintVisitor] = useState(null);
  const [checkingOut, setCheckingOut] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [checkoutDone, setCheckoutDone] = useState(null);

  useEffect(() => { fetchVisitors(); }, []);

  const fetchVisitors = async () => {
    const res = await fetch('/api/visitors');
    setVisitors(await res.json());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const resolvedVisiting = form.visitingWhom === '__other__' ? visitingOther.trim() : form.visitingWhom;
      if (!resolvedVisiting) { setError('Please specify who the visitor is visiting.'); setLoading(false); return; }
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, visitingWhom: resolvedVisiting, checkIn: new Date(form.checkIn).toISOString() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const newVisitor = await res.json();
      setVisitors((v) => [newVisitor, ...v]);
      setSuccess(`Visitor ${newVisitor.name} ${newVisitor.surname} registered!`);
      setPrintVisitor(newVisitor);
      setForm({ name:'', surname:'', company:'', checkIn:toLocalInput(new Date()), visitingWhom:'' });
      setVisitingOther('');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (id) => {
    setCheckingOut(id);
    try {
      const res = await fetch(`/api/visitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkOut: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const updated = await res.json();
      setVisitors((v) => v.map((vis) => vis.id === id ? updated : vis));
      setCheckoutDone(updated);
      setSearchName('');
      setTimeout(() => setCheckoutDone(null), 6000);
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckingOut(null);
    }
  };

  const handlePrint = (visitor) => {
    setPrintVisitor(visitor);
    setTimeout(() => window.print(), 100);
  };

  const activeVisitors = visitors.filter(v => !v.checkOut);
  const filteredActive = searchName.trim().length >= 1
    ? activeVisitors.filter(v => `${v.name} ${v.surname}`.toLowerCase().includes(searchName.toLowerCase()))
    : activeVisitors;

  return (
    <>
      <Head>
        <title>Visitor Management System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {printVisitor && (
        <div id="print-label">
          <div className="label-header">VISITOR PASS · {new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</div>
          <div className="label-name">{printVisitor.name} {printVisitor.surname}</div>
          <div className="label-company">{printVisitor.company || 'Independent'}</div>
          <div className="label-grid">
            <div className="label-field"><strong>Check In</strong>{formatTime(printVisitor.checkIn)}</div>
            <div className="label-field"><strong>Check Out</strong>{formatTime(printVisitor.checkOut)}</div>
          </div>
          <div className="label-visiting"><strong>Visiting</strong> {printVisitor.visitingWhom}</div>
        </div>
      )}

      <div style={S.wrapper}>
        <header style={S.header}>
          <div style={S.headerInner}>
            <div>
              <div style={S.eyebrow}>FACILITY ACCESS CONTROL</div>
              <h1 style={S.title}>VISITOR<br/>LOG</h1>
            </div>
            <ClockDisplay />
          </div>
          <div style={S.headerLine} />
        </header>

        <main style={S.main}>
          <div style={S.tabBar}>
            <button style={{...S.tab,...(tab==='register'?S.tabActive:{})}} onClick={()=>setTab('register')}>
              + REGISTER VISITOR
            </button>
            <button style={{...S.tab,...(tab==='checkout'?S.tabActive:{})}} onClick={()=>{setTab('checkout');setCheckoutDone(null);setSearchName('');}}>
              ↩ CHECK OUT
              {activeVisitors.length > 0 && <span style={S.badge}>{activeVisitors.length}</span>}
            </button>
          </div>

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <div style={S.panel}>
              <form onSubmit={handleSubmit} style={S.form}>
                <div style={S.formGrid}>
                  <Field label="FIRST NAME *" col="1">
                    <input style={S.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John" required />
                  </Field>
                  <Field label="SURNAME *" col="2">
                    <input style={S.input} value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})} placeholder="Smith" required />
                  </Field>
                  <Field label="COMPANY / ORGANISATION" col="1 / -1">
                    <input style={S.input} value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Acme Corporation" />
                  </Field>
                  <Field label="CHECK-IN TIME *" col="1">
                    <input style={S.input} type="datetime-local" value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})} required />
                  </Field>
                  <Field label="VISITING WHOM *" col="2">
                    <select style={S.input} value={form.visitingWhom} onChange={e=>setForm({...form,visitingWhom:e.target.value})} required>
                      <option value="">— Select staff member —</option>
                      {STAFF.map(n => <option key={n} value={n}>{n}</option>)}
                      <option value="__other__">Other (type name below)</option>
                    </select>
                    {form.visitingWhom === '__other__' && (
                      <input style={{...S.input,marginTop:'8px'}} value={visitingOther} onChange={e=>setVisitingOther(e.target.value)} placeholder="Enter name..." required />
                    )}
                  </Field>
                </div>
                {error && <div style={S.alertError}>⚠ {error}</div>}
                {success && (
                  <div style={S.alertSuccess}>
                    ✓ {success}
                    {printVisitor && (
                      <button type="button" style={S.printInlineBtn} onClick={()=>handlePrint(printVisitor)}>🖨 PRINT LABEL</button>
                    )}
                  </div>
                )}
                <div style={S.formActions}>
                  <button type="submit" style={S.submitBtn} disabled={loading}>
                    {loading ? 'REGISTERING...' : '→ REGISTER & CHECK IN'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── CHECK OUT KIOSK TAB ── */}
          {tab === 'checkout' && (
            <div style={S.panel}>
              {checkoutDone ? (
                <div style={S.successBox}>
                  <div style={S.successIcon}>✓</div>
                  <div style={S.successName}>{checkoutDone.name} {checkoutDone.surname}</div>
                  <div style={S.successMsg}>Checked out successfully at {formatTime(checkoutDone.checkOut)}</div>
                  <div style={S.successVisiting}>Thanks for visiting {checkoutDone.visitingWhom}</div>
                  <div style={S.successActions}>
                    <button style={S.printInlineBtn} onClick={()=>handlePrint(checkoutDone)}>🖨 PRINT LABEL</button>
                    <button style={S.anotherBtn} onClick={()=>setCheckoutDone(null)}>Check out another visitor</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={S.kioskHead}>
                    <div style={S.kioskTitle}>CHECKING OUT?</div>
                    <div style={S.kioskSub}>Type your name to find yourself, then tap Check Out</div>
                  </div>

                  <div style={S.searchWrap}>
                    <span style={S.searchIcon}>⌕</span>
                    <input
                      style={S.searchInput}
                      value={searchName}
                      onChange={e=>setSearchName(e.target.value)}
                      placeholder="Start typing your name..."
                      autoFocus
                    />
                    {searchName && (
                      <button style={S.clearBtn} onClick={()=>setSearchName('')}>✕</button>
                    )}
                  </div>

                  {activeVisitors.length === 0 ? (
                    <div style={S.empty}>NO ACTIVE VISITORS ON SITE</div>
                  ) : searchName.trim().length === 0 ? (
                    <div style={S.kioskHint}>
                      <span style={S.kioskHintDot}>●</span>
                      {activeVisitors.length} visitor{activeVisitors.length !== 1 ? 's' : ''} currently on site
                    </div>
                  ) : filteredActive.length === 0 ? (
                    <div style={S.empty}>NO MATCH FOR "{searchName.toUpperCase()}"</div>
                  ) : (
                    <div style={S.cards}>
                      {filteredActive.map(v => (
                        <div key={v.id} style={S.card}>
                          <div style={S.cardBody}>
                            <div style={S.cardName}>{v.name} {v.surname}</div>
                            {v.company && <div style={S.cardCompany}>{v.company}</div>}
                            <div style={S.cardMeta}>
                              Visiting <strong>{v.visitingWhom}</strong>
                              <span style={S.dot}>·</span>
                              Checked in {formatTime(v.checkIn)}
                            </div>
                          </div>
                          <button
                            style={{...S.checkOutBtn, opacity: checkingOut===v.id ? 0.6 : 1}}
                            onClick={() => handleCheckOut(v.id)}
                            disabled={checkingOut === v.id}
                          >
                            {checkingOut === v.id ? 'SIGNING OUT...' : 'CHECK OUT →'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        <footer style={S.footer}>
          <span style={S.footerText}>VMS · SECURE FACILITY ACCESS · ALL ENTRIES LOGGED</span>
          <a href="/admin" style={S.adminLink}>ADMIN ›</a>
        </footer>
      </div>
    </>
  );
}

function Field({ label, col, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px', gridColumn:col }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <div style={S.clockTime}>{time}</div>;
}

const S = {
  wrapper: { minHeight:'100vh', display:'flex', flexDirection:'column' },
  header: { padding:'32px 40px 0', background:'var(--bg)' },
  headerInner: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px' },
  eyebrow: { fontFamily:'var(--mono)', fontSize:'11px', color:'var(--accent)', letterSpacing:'3px', marginBottom:'8px' },
  title: { fontFamily:'var(--condensed)', fontSize:'clamp(48px,8vw,80px)', fontWeight:900, lineHeight:0.9, letterSpacing:'-1px' },
  clockTime: { fontFamily:'var(--mono)', fontSize:'clamp(24px,4vw,40px)', color:'var(--accent)', letterSpacing:'2px' },
  headerLine: { height:'2px', background:'linear-gradient(90deg, var(--accent) 0%, var(--border) 60%, transparent 100%)' },
  main: { flex:1, padding:'0 40px 40px', maxWidth:'1400px', width:'100%', margin:'0 auto' },

  tabBar: { display:'flex', gap:'2px', marginTop:'32px', marginBottom:'1px' },
  tab: { position:'relative', padding:'10px 24px', background:'var(--surface)', border:'1px solid var(--border)', borderBottom:'none', color:'var(--text-dim)', fontFamily:'var(--mono)', fontSize:'11px', letterSpacing:'1.5px', cursor:'pointer', transition:'all 0.15s' },
  tabActive: { background:'var(--surface2)', color:'var(--accent)', borderColor:'var(--border-accent)', borderBottomColor:'var(--surface2)' },
  badge: { display:'inline-flex', alignItems:'center', justifyContent:'center', marginLeft:'8px', background:'var(--accent)', color:'#000', fontFamily:'var(--mono)', fontSize:'10px', fontWeight:700, borderRadius:'10px', padding:'1px 7px' },

  panel: { background:'var(--surface)', border:'1px solid var(--border)', padding:'32px', borderTopLeftRadius:0 },
  form: { display:'flex', flexDirection:'column', gap:'24px' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  label: { fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'2px', color:'var(--text-dim)' },
  input: { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'2px', padding:'12px 16px', color:'var(--text)', fontFamily:'var(--sans)', fontSize:'15px', outline:'none', width:'100%', appearance:'auto' },
  formActions: { display:'flex', justifyContent:'flex-end' },
  submitBtn: { background:'var(--accent)', color:'#000', border:'none', padding:'14px 36px', fontFamily:'var(--condensed)', fontWeight:700, fontSize:'16px', letterSpacing:'2px', cursor:'pointer' },
  alertError: { background:'rgba(255,71,87,0.1)', border:'1px solid var(--danger)', color:'var(--danger)', padding:'12px 16px', fontFamily:'var(--mono)', fontSize:'12px', borderRadius:'2px' },
  alertSuccess: { background:'rgba(46,213,115,0.08)', border:'1px solid var(--success)', color:'var(--success)', padding:'12px 16px', fontFamily:'var(--mono)', fontSize:'12px', borderRadius:'2px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px' },
  printInlineBtn: { background:'var(--success)', color:'#000', border:'none', padding:'8px 16px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px', cursor:'pointer', whiteSpace:'nowrap' },

  // Kiosk
  kioskHead: { marginBottom:'28px' },
  kioskTitle: { fontFamily:'var(--condensed)', fontSize:'32px', fontWeight:900, letterSpacing:'2px', marginBottom:'6px' },
  kioskSub: { fontFamily:'var(--mono)', fontSize:'12px', color:'var(--text-dim)', letterSpacing:'1px' },
  kioskHint: { display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', padding:'32px', fontFamily:'var(--mono)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'2px' },
  kioskHintDot: { color:'var(--accent)', fontSize:'8px' },

  searchWrap: { position:'relative', marginBottom:'24px', display:'flex', alignItems:'center' },
  searchIcon: { position:'absolute', left:'18px', fontSize:'22px', color:'var(--text-muted)', pointerEvents:'none' },
  searchInput: { background:'var(--bg)', border:'2px solid var(--border-accent)', borderRadius:'2px', padding:'16px 48px 16px 52px', color:'var(--text)', fontFamily:'var(--sans)', fontSize:'20px', outline:'none', width:'100%' },
  clearBtn: { position:'absolute', right:'14px', background:'none', border:'none', color:'var(--text-muted)', fontSize:'16px', cursor:'pointer', padding:'4px 8px' },

  cards: { display:'flex', flexDirection:'column', gap:'12px' },
  card: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border-accent)', padding:'20px 24px', gap:'16px' },
  cardBody: { flex:1 },
  cardName: { fontFamily:'var(--condensed)', fontSize:'24px', fontWeight:700, letterSpacing:'0.5px' },
  cardCompany: { fontSize:'13px', color:'var(--text-dim)', marginTop:'2px' },
  cardMeta: { fontFamily:'var(--mono)', fontSize:'11px', color:'var(--text-muted)', marginTop:'8px' },
  dot: { margin:'0 8px' },
  checkOutBtn: { background:'var(--accent)', color:'#000', border:'none', padding:'14px 28px', fontFamily:'var(--condensed)', fontWeight:700, fontSize:'15px', letterSpacing:'2px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'opacity 0.15s' },

  // Success
  successBox: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:'10px', textAlign:'center' },
  successIcon: { fontSize:'64px', color:'var(--success)', lineHeight:1, marginBottom:'8px' },
  successName: { fontFamily:'var(--condensed)', fontSize:'36px', fontWeight:900, letterSpacing:'1px' },
  successMsg: { fontFamily:'var(--mono)', fontSize:'13px', color:'var(--success)', letterSpacing:'1px' },
  successVisiting: { fontFamily:'var(--mono)', fontSize:'12px', color:'var(--text-dim)', marginBottom:'8px' },
  successActions: { display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap', justifyContent:'center' },
  anotherBtn: { background:'transparent', border:'1px solid var(--border-accent)', color:'var(--text-dim)', padding:'8px 16px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px', cursor:'pointer' },

  empty: { textAlign:'center', padding:'60px', fontFamily:'var(--mono)', color:'var(--text-muted)', fontSize:'12px', letterSpacing:'3px' },
  footer: { padding:'16px 40px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  footerText: { fontFamily:'var(--mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'3px' },
  adminLink: { fontFamily:'var(--mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'2px', textDecoration:'none', opacity:0.35 },
};
