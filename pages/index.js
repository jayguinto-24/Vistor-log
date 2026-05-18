import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const toLocalInput = (date) => {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Home() {
  const [visitors, setVisitors] = useState([]);
  const [form, setForm] = useState({
    name: '', surname: '', company: '', checkIn: toLocalInput(new Date()), visitingWhom: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printVisitor, setPrintVisitor] = useState(null);
  const [tab, setTab] = useState('register'); // 'register' | 'log'
  const [checkingOut, setCheckingOut] = useState(null);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    const res = await fetch('/api/visitors');
    const data = await res.json();
    setVisitors(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, checkIn: new Date(form.checkIn).toISOString() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const newVisitor = await res.json();
      setVisitors((v) => [newVisitor, ...v]);
      setSuccess(`Visitor ${newVisitor.name} ${newVisitor.surname} registered!`);
      setPrintVisitor(newVisitor);
      setForm({ name: '', surname: '', company: '', checkIn: toLocalInput(new Date()), visitingWhom: '' });
      setTimeout(() => setSuccess(''), 5000);
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

  return (
    <>
      <Head>
        <title>Visitor Management System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Hidden print label */}
      {printVisitor && (
        <div id="print-label">
          <div className="label-header">VISITOR PASS · {new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</div>
          <div className="label-name">{printVisitor.name} {printVisitor.surname}</div>
          <div className="label-company">{printVisitor.company || 'Independent'}</div>
          <div className="label-grid">
            <div className="label-field"><strong>Check In</strong>{formatTime(printVisitor.checkIn)}</div>
            <div className="label-field"><strong>Check Out</strong>{formatTime(printVisitor.checkOut)}</div>
          </div>
          <div className="label-visiting">
            <strong>Visiting</strong> {printVisitor.visitingWhom}
          </div>
        </div>
      )}

      <div style={styles.wrapper}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div>
              <div style={styles.headerEyebrow}>FACILITY ACCESS CONTROL</div>
              <h1 style={styles.headerTitle}>VISITOR<br/>LOG</h1>
            </div>
            <div style={styles.clock}>
              <ClockDisplay />
            </div>
          </div>
          <div style={styles.headerLine} />
        </header>

        <main style={styles.main}>
          {/* Tab Bar */}
          <div style={styles.tabBar}>
            {['register', 'log'].map((t) => (
              <button key={t} style={{...styles.tab, ...(tab===t?styles.tabActive:{})}} onClick={() => setTab(t)}>
                {t === 'register' ? '+ REGISTER VISITOR' : `⊞ VISITOR LOG (${visitors.length})`}
              </button>
            ))}
          </div>

          {tab === 'register' && (
            <div style={styles.panel}>
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGrid}>
                  <FormField label="FIRST NAME *" style={{gridColumn:'1'}}>
                    <input style={styles.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John" required />
                  </FormField>
                  <FormField label="SURNAME *" style={{gridColumn:'2'}}>
                    <input style={styles.input} value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})} placeholder="Smith" required />
                  </FormField>
                  <FormField label="COMPANY / ORGANISATION" style={{gridColumn:'1 / -1'}}>
                    <input style={styles.input} value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="DRC Switchboards" />
                  </FormField>
                  <FormField label="CHECK-IN TIME *" style={{gridColumn:'1'}}>
                    <input style={styles.input} type="datetime-local" value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})} required />
                  </FormField>
                  <FormField label="VISITING WHOM *" style={{gridColumn:'2'}}>
                    <input style={styles.input} value={form.visitingWhom} onChange={e=>setForm({...form,visitingWhom:e.target.value})} placeholder="Jane Doe — Engineering" required />
                  </FormField>
                </div>

                {error && <div style={styles.alertError}>⚠ {error}</div>}
                {success && (
                  <div style={styles.alertSuccess}>
                    ✓ {success}
                    {printVisitor && (
                      <button type="button" style={styles.printInlineBtn} onClick={() => handlePrint(printVisitor)}>
                        🖨 PRINT LABEL
                      </button>
                    )}
                  </div>
                )}

                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'REGISTERING...' : '→ REGISTER & CHECK IN'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'log' && (
            <div style={styles.panel}>
              {visitors.length === 0 ? (
                <div style={styles.empty}>NO VISITORS LOGGED YET</div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['NAME','COMPANY','VISITING','CHECK IN','CHECK OUT','ACTIONS'].map(h=>(
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map((v, i) => (
                        <tr key={v.id} style={{...styles.tr, animationDelay:`${i*30}ms`}}>
                          <td style={styles.td}>
                            <div style={styles.nameCell}>{v.name} {v.surname}</div>
                            <div style={styles.idCell}>#{v.id.slice(0,8).toUpperCase()}</div>
                          </td>
                          <td style={styles.td}>{v.company || <span style={styles.dim}>—</span>}</td>
                          <td style={styles.td}>{v.visitingWhom}</td>
                          <td style={{...styles.td, ...styles.mono}}>{formatDateTime(v.checkIn)}</td>
                          <td style={{...styles.td, ...styles.mono}}>
                            {v.checkOut
                              ? <span style={styles.checkedOut}>{formatDateTime(v.checkOut)}</span>
                              : <span style={styles.active}>● ACTIVE</span>}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              <button style={styles.printBtn} onClick={() => handlePrint(v)} title="Print Label">
                                🖨
                              </button>
                              {!v.checkOut && (
                                <button
                                  style={styles.checkOutBtn}
                                  onClick={() => handleCheckOut(v.id)}
                                  disabled={checkingOut === v.id}
                                >
                                  {checkingOut === v.id ? '...' : 'CHECK OUT'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

        <footer style={styles.footer}>
          <span style={styles.footerText}>VMS · SECURE FACILITY ACCESS · ALL ENTRIES LOGGED</span>
        </footer>
      </div>
    </>
  );
}

function FormField({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      <label style={styles.label}>{label}</label>
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
  return <div style={styles.clockTime}>{time}</div>;
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { padding: '32px 40px 0', background: 'var(--bg)' },
  headerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' },
  headerEyebrow: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '8px' },
  headerTitle: { fontFamily: 'var(--condensed)', fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-1px', color: 'var(--text)' },
  clock: { textAlign: 'right' },
  clockTime: { fontFamily: 'var(--mono)', fontSize: 'clamp(24px, 4vw, 40px)', color: 'var(--accent)', letterSpacing: '2px' },
  headerLine: { height: '2px', background: `linear-gradient(90deg, var(--accent) 0%, var(--border) 60%, transparent 100%)` },
  main: { flex: 1, padding: '0 40px 40px', maxWidth: '1400px', width: '100%', margin: '0 auto' },
  tabBar: { display: 'flex', gap: '2px', marginTop: '32px', marginBottom: '1px' },
  tab: { padding: '10px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '1.5px', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { background: 'var(--surface2)', color: 'var(--accent)', borderColor: 'var(--border-accent)', borderBottomColor: 'var(--surface2)' },
  panel: { background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px', borderTopLeftRadius: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  label: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '2px', color: 'var(--text-dim)' },
  input: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '2px', padding: '12px 16px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '15px', outline: 'none', transition: 'border-color 0.15s', width: '100%' },
  formActions: { display: 'flex', justifyContent: 'flex-end' },
  submitBtn: { background: 'var(--accent)', color: '#000', border: 'none', padding: '14px 36px', fontFamily: 'var(--condensed)', fontWeight: 700, fontSize: '16px', letterSpacing: '2px', cursor: 'pointer', transition: 'opacity 0.15s' },
  alertError: { background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: '12px', borderRadius: '2px' },
  alertSuccess: { background: 'rgba(46,213,115,0.08)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: '12px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  printInlineBtn: { background: 'var(--success)', color: '#000', border: 'none', padding: '6px 14px', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer', whiteSpace: 'nowrap' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '2px', color: 'var(--text-muted)', padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  td: { padding: '14px 16px', fontSize: '14px', verticalAlign: 'middle' },
  nameCell: { fontWeight: 600, color: 'var(--text)' },
  idCell: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' },
  mono: { fontFamily: 'var(--mono)', fontSize: '12px' },
  dim: { color: 'var(--text-muted)' },
  active: { color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '1px' },
  checkedOut: { color: 'var(--text-muted)' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  printBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', borderRadius: '2px', transition: 'all 0.15s' },
  checkOutBtn: { background: 'transparent', border: '1px solid var(--border-accent)', color: 'var(--text-dim)', padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.15s' },
  empty: { textAlign: 'center', padding: '60px', fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '3px' },
  footer: { padding: '16px 40px', borderTop: '1px solid var(--border)', textAlign: 'center' },
  footerText: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '3px' },
};
