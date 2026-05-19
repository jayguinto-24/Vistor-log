import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ADMIN_PIN = '1234'; // ← Change this PIN

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:true });
};

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [visitors, setVisitors] = useState([]);
  const [checkingOut, setCheckingOut] = useState(null);
  const [printVisitor, setPrintVisitor] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'out'
  const [search, setSearch] = useState('');

  const handlePin = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setUnlocked(true);
      setPinError(false);
      fetchVisitors();
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const fetchVisitors = async () => {
    const res = await fetch('/api/visitors');
    setVisitors(await res.json());
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

  const filtered = visitors
    .filter(v => filter === 'all' ? true : filter === 'active' ? !v.checkOut : !!v.checkOut)
    .filter(v => !search.trim() || `${v.name} ${v.surname} ${v.company} ${v.visitingWhom}`.toLowerCase().includes(search.toLowerCase()));

  const activeCount = visitors.filter(v => !v.checkOut).length;

  return (
    <>
      <Head><title>Admin — Visitor Log</title></Head>

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
        {!unlocked ? (
          <div style={S.pinScreen}>
            <div style={S.pinBox}>
              <div style={S.pinEyebrow}>RESTRICTED ACCESS</div>
              <div style={S.pinTitle}>ADMIN LOGIN</div>
              <form onSubmit={handlePin} style={S.pinForm}>
                <input
                  style={{...S.pinInput, ...(pinError ? S.pinInputError : {})}}
                  type="password"
                  value={pin}
                  onChange={e=>setPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoFocus
                  maxLength={10}
                />
                {pinError && <div style={S.pinErrorMsg}>⚠ Incorrect PIN</div>}
                <button type="submit" style={S.pinBtn}>UNLOCK →</button>
              </form>
              <Link href="/" style={S.backLink}>← Back to reception</Link>
            </div>
          </div>
        ) : (
          <>
            <header style={S.header}>
              <div style={S.headerInner}>
                <div>
                  <div style={S.eyebrow}>ADMIN · FULL ACCESS</div>
                  <h1 style={S.title}>VISITOR<br/>LOG</h1>
                </div>
                <div style={S.headerRight}>
                  <div style={S.stat}><span style={S.statNum}>{visitors.length}</span><span style={S.statLabel}>TOTAL</span></div>
                  <div style={S.statDivider}/>
                  <div style={S.stat}><span style={{...S.statNum, color:'var(--accent)'}}>{activeCount}</span><span style={S.statLabel}>ON SITE</span></div>
                  <div style={S.statDivider}/>
                  <div style={S.stat}><span style={S.statNum}>{visitors.length - activeCount}</span><span style={S.statLabel}>CHECKED OUT</span></div>
                </div>
              </div>
              <div style={S.headerLine} />
            </header>

            <main style={S.main}>
              <div style={S.toolbar}>
                <div style={S.filterBtns}>
                  {[['all','ALL'],['active','ON SITE'],['out','CHECKED OUT']].map(([val,label]) => (
                    <button key={val} style={{...S.filterBtn,...(filter===val?S.filterBtnActive:{})}} onClick={()=>setFilter(val)}>
                      {label}
                      {val==='active' && activeCount > 0 && <span style={S.badge}>{activeCount}</span>}
                    </button>
                  ))}
                </div>
                <div style={S.searchWrap}>
                  <input style={S.searchInput} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search visitors..." />
                  {search && <button style={S.clearBtn} onClick={()=>setSearch('')}>✕</button>}
                </div>
                <div style={S.toolbarRight}>
                  <button style={S.refreshBtn} onClick={fetchVisitors}>↻ REFRESH</button>
                  <Link href="/" style={S.backBtn}>← RECEPTION</Link>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={S.empty}>NO RECORDS FOUND</div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['#','NAME','COMPANY','VISITING','CHECK IN','CHECK OUT','STATUS','ACTIONS'].map(h=>(
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((v, i) => (
                        <tr key={v.id} style={{...S.tr, ...(v.checkOut ? {} : S.trActive)}}>
                          <td style={{...S.td, ...S.mono, color:'var(--text-muted)'}}>{i+1}</td>
                          <td style={S.td}>
                            <div style={S.nameCell}>{v.name} {v.surname}</div>
                            <div style={S.idCell}>#{v.id.slice(0,8).toUpperCase()}</div>
                          </td>
                          <td style={S.td}>{v.company || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                          <td style={S.td}>{v.visitingWhom}</td>
                          <td style={{...S.td,...S.mono}}>{formatDateTime(v.checkIn)}</td>
                          <td style={{...S.td,...S.mono}}>{v.checkOut ? formatDateTime(v.checkOut) : <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                          <td style={S.td}>
                            {v.checkOut
                              ? <span style={S.badgeOut}>OUT</span>
                              : <span style={S.badgeActive}>● ACTIVE</span>}
                          </td>
                          <td style={S.td}>
                            <div style={S.actions}>
                              <button style={S.printBtn} onClick={()=>handlePrint(v)} title="Print label">🖨</button>
                              {!v.checkOut && (
                                <button style={S.checkOutBtn} onClick={()=>handleCheckOut(v.id)} disabled={checkingOut===v.id}>
                                  {checkingOut===v.id ? '...' : 'CHECK OUT'}
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
            </main>

            <footer style={S.footer}>
              <span style={S.footerText}>ADMIN VIEW · ALL RECORDS · VMS</span>
              <button style={S.lockBtn} onClick={()=>{setUnlocked(false);setPin('');}}>🔒 LOCK</button>
            </footer>
          </>
        )}
      </div>
    </>
  );
}

const S = {
  wrapper: { minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' },

  // PIN screen
  pinScreen: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' },
  pinBox: { width:'100%', maxWidth:'380px', display:'flex', flexDirection:'column', alignItems:'center', gap:'24px' },
  pinEyebrow: { fontFamily:'var(--mono)', fontSize:'11px', color:'var(--accent)', letterSpacing:'3px' },
  pinTitle: { fontFamily:'var(--condensed)', fontSize:'48px', fontWeight:900, letterSpacing:'2px', textAlign:'center' },
  pinForm: { display:'flex', flexDirection:'column', gap:'12px', width:'100%' },
  pinInput: { background:'var(--surface)', border:'2px solid var(--border)', borderRadius:'2px', padding:'16px 20px', color:'var(--text)', fontFamily:'var(--mono)', fontSize:'24px', letterSpacing:'8px', textAlign:'center', outline:'none', width:'100%', transition:'border-color 0.15s' },
  pinInputError: { borderColor:'var(--danger)', animation:'shake 0.3s ease' },
  pinErrorMsg: { fontFamily:'var(--mono)', fontSize:'12px', color:'var(--danger)', textAlign:'center', letterSpacing:'1px' },
  pinBtn: { background:'var(--accent)', color:'#000', border:'none', padding:'14px', fontFamily:'var(--condensed)', fontWeight:700, fontSize:'16px', letterSpacing:'2px', cursor:'pointer', width:'100%' },
  backLink: { fontFamily:'var(--mono)', fontSize:'11px', color:'var(--text-muted)', letterSpacing:'2px', textDecoration:'none' },

  // Admin layout
  header: { padding:'32px 40px 0' },
  headerInner: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px', flexWrap:'wrap', gap:'16px' },
  eyebrow: { fontFamily:'var(--mono)', fontSize:'11px', color:'var(--accent)', letterSpacing:'3px', marginBottom:'8px' },
  title: { fontFamily:'var(--condensed)', fontSize:'clamp(40px,6vw,72px)', fontWeight:900, lineHeight:0.9, letterSpacing:'-1px' },
  headerRight: { display:'flex', alignItems:'center', gap:'24px' },
  stat: { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' },
  statNum: { fontFamily:'var(--condensed)', fontSize:'36px', fontWeight:900, lineHeight:1 },
  statLabel: { fontFamily:'var(--mono)', fontSize:'9px', color:'var(--text-muted)', letterSpacing:'2px' },
  statDivider: { width:'1px', height:'40px', background:'var(--border)' },
  headerLine: { height:'2px', background:'linear-gradient(90deg, var(--accent) 0%, var(--border) 60%, transparent 100%)' },

  main: { flex:1, padding:'0 40px 40px', maxWidth:'1600px', width:'100%', margin:'0 auto' },
  toolbar: { display:'flex', alignItems:'center', gap:'12px', padding:'20px 0', flexWrap:'wrap' },
  filterBtns: { display:'flex', gap:'2px' },
  filterBtn: { padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1.5px', cursor:'pointer', transition:'all 0.15s' },
  filterBtnActive: { background:'var(--surface2)', color:'var(--accent)', borderColor:'var(--border-accent)' },
  badge: { display:'inline-flex', alignItems:'center', justifyContent:'center', marginLeft:'6px', background:'var(--accent)', color:'#000', fontFamily:'var(--mono)', fontSize:'9px', fontWeight:700, borderRadius:'10px', padding:'0 6px' },
  searchWrap: { position:'relative', flex:'1', minWidth:'200px' },
  searchInput: { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'2px', padding:'8px 36px 8px 14px', color:'var(--text)', fontFamily:'var(--sans)', fontSize:'14px', outline:'none', width:'100%' },
  clearBtn: { position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', fontSize:'12px', cursor:'pointer' },
  toolbarRight: { display:'flex', gap:'8px', marginLeft:'auto' },
  refreshBtn: { background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', padding:'8px 14px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px', cursor:'pointer' },
  backBtn: { background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', padding:'8px 14px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px', cursor:'pointer', textDecoration:'none', display:'flex', alignItems:'center' },

  tableWrap: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'2px', color:'var(--text-muted)', padding:'10px 14px', textAlign:'left', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid var(--border)', transition:'background 0.1s' },
  trActive: { borderLeft:'2px solid var(--accent)' },
  td: { padding:'12px 14px', fontSize:'13px', verticalAlign:'middle' },
  nameCell: { fontWeight:600 },
  idCell: { fontFamily:'var(--mono)', fontSize:'10px', color:'var(--text-muted)', marginTop:'2px' },
  mono: { fontFamily:'var(--mono)', fontSize:'11px' },
  badgeActive: { color:'var(--accent)', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px' },
  badgeOut: { color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px' },
  actions: { display:'flex', gap:'6px', alignItems:'center' },
  printBtn: { background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'5px 9px', cursor:'pointer', fontSize:'12px', borderRadius:'2px' },
  checkOutBtn: { background:'transparent', border:'1px solid var(--border-accent)', color:'var(--text-dim)', padding:'5px 10px', fontFamily:'var(--mono)', fontSize:'9px', letterSpacing:'1px', cursor:'pointer' },

  empty: { textAlign:'center', padding:'60px', fontFamily:'var(--mono)', color:'var(--text-muted)', fontSize:'12px', letterSpacing:'3px' },
  footer: { padding:'16px 40px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  footerText: { fontFamily:'var(--mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'3px' },
  lockBtn: { background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', padding:'6px 14px', fontFamily:'var(--mono)', fontSize:'10px', letterSpacing:'1px', cursor:'pointer' },
};
