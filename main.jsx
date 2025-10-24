// FILE: main.jsx
/* ===================== EconoLearn - main.jsx (v10) ===================== */
const { useEffect, useMemo, useRef, useState } = React;

/* ----------------- Global version to bust cache ----------------- */
const APP_VERSION = '10'; // bump when you deploy

/* ----------------- LocalStorage helpers ----------------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ----------------- Time helpers (rule: 1.2 min per Q) ----------------- */
const TIME_PER_Q_MIN = 1.2;
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ----------------- Small utils ----------------- */
const shuffle = (arr) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a; };
const pickN = (arr, n) => shuffle(arr).slice(0, n);

/* ----------------- Background (Ganesh center, stronger opacity) ----------------- */
const GaneshBanner = () => (
  <div className="flex flex-col items-center mt-6">
    <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-rose-400">EconoLearn</div>
    <div className="mt-3 w-[140px] h-[140px] md:w-[160px] md:h-[160px] bg-[url('./ganesh.png')] bg-no-repeat bg-contain opacity-45"></div>
  </div>
);

/* ----------------- UI helpers ----------------- */
const glassCard = "relative overflow-visible rounded-3xl p-6 md:p-7 bg-white/55 backdrop-blur-xl border border-white/50 shadow-halo";
const glassBtn  = (extra="") => `px-4 py-2 rounded-lg border border-white/40 bg-white/60 hover:bg-white/75 text-gray-800 backdrop-blur-xl transition shadow-sm hover:shadow transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;
const solidBtn  = (extra="") => `px-5 py-2 rounded-lg text-white shadow-md transform-gpu hover:scale-[1.03] active:scale-[0.99] ${extra}`;

/* ----------------- Ripple action ----------------- */
function withRipple(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple-dot';
  dot.style.left = (e.clientX - rect.left - 4) + 'px';
  dot.style.top  = (e.clientY - rect.top  - 4) + 'px';
  el.appendChild(dot);
  setTimeout(()=> dot.remove(), 650);
}

/* ----------------- Confetti (on high score) ----------------- */
const Confetti = ({ on }) => {
  React.useEffect(() => {
    if (!on) return;
    const c = document.createElement('canvas'); c.style.position='fixed'; c.style.inset='0'; c.style.pointerEvents='none'; c.style.zIndex=9999;
    document.body.appendChild(c);
    const ctx=c.getContext('2d'); const resize=()=>{c.width=innerWidth; c.height=innerHeight;}; resize(); addEventListener('resize',resize);
    const colors=["#14b8a6","#f43f5e","#60a5fa","#a78bfa","#22c55e","#f59e0b"];
    const N=Math.min(200, ((c.width+c.height)/7)|0); const G=0.14, D=0.985, cx=c.width/2, cy=c.height*0.15;
    const p=Array.from({length:N}).map(()=>{const ang=Math.random()*Math.PI-Math.PI/2, sp=5+Math.random()*8;
      return {x:cx+(Math.random()*100-50), y:cy+(Math.random()*24-12), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-2,
              s:2+Math.random()*4, r:Math.random()*Math.PI*2, vr:(Math.random()-0.5)*0.2, col:colors[(Math.random()*colors.length)|0], life:0, ttl:250+Math.random()*100};});
    let raf=0, frame=0;
    const tick=()=>{frame++; ctx.clearRect(0,0,c.width,c.height);
      p.forEach(o=>{o.vx*=D; o.vy=o.vy*D+G; o.x+=o.vx; o.y+=o.vy; o.r+=o.vr; o.life++;
        const a=Math.max(0,1-o.life/o.ttl); ctx.globalAlpha=a; ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.r);
        ctx.fillStyle=o.col; ctx.fillRect(-o.s,-o.s*0.5,o.s*2,o.s); ctx.restore(); ctx.globalAlpha=1;});
      if(frame<600) raf=requestAnimationFrame(tick); else cleanup(); };
    const cleanup=()=>{cancelAnimationFrame(raf); removeEventListener('resize',resize); c.remove();};
    raf=requestAnimationFrame(tick); return cleanup;
  },[on]);
  return null;
};

/* ----------------- TopBar ----------------- */
const TopBar = ({ onHome, onHistory, onAnalytics, page, mode, timeLeft }) => (
  <header className="topglass sticky top-0 z-20">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">
        <span className="font-extrabold text-gray-900">EconoLearn</span>
        <span className="text-gray-500 font-semibold"> — CUET PG Economics</span>
      </h1>
      <div className="flex items-center gap-2 md:gap-3 text-sm">
        {page==='home' && (
          <>
            <button onClick={onHistory}   className={glassBtn()}>Review Past Results</button>
            <button onClick={onAnalytics} className={glassBtn()}>Analytics</button>
          </>
        )}
        {page==='quiz' && mode==='test' && (
          <span className={`px-2 py-1 rounded border ${timeLeft<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'}`}>⏱ {fmt(timeLeft)}</span>
        )}
        {page!=='home' && <button onClick={onHome} className={glassBtn()}>Home</button>}
      </div>
    </div>
  </header>
);

/* ----------------- Progress ----------------- */
const Progress = ({ i, total }) => {
  const pct = total ? Math.round(((i+1)/total)*100) : 0;
  return (
    <div className="w-full bg-white/50 backdrop-blur h-2 rounded-full shadow-inner">
      <div className="bg-teal-500 h-2 rounded-full transition-all" style={{width:`${pct}%`}} />
    </div>
  );
};

/* ----------------- FancySelect ----------------- */
function FancySelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const btnRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    }
  }, []);

  const toggle = () => {
    const r = btnRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const menuH = 220;
    setPlacement(below >= menuH ? 'bottom' : 'top');
    setOpen(v=>!v);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="w-full text-left p-2 pr-9 border rounded-lg bg-white/70 backdrop-blur hover:bg-white/80 transition"
      >
        {value}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
      </button>

      {open && (
        <ul
          className={`absolute left-0 right-0 max-h-60 overflow-auto rounded-xl border bg-white/95 backdrop-blur shadow-xl z-30
                      ${placement==='bottom' ? 'mt-2 top-full' : 'mb-2 bottom-full'}`}
          role="listbox"
        >
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer hover:bg-teal-50 ${opt===value?'bg-teal-100 text-teal-700 font-medium':''}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ====================================================================== */
const App = () => {
  const [page, setPage] = useState('home');           // home | quiz | result | history | analytics
  const [mode, setMode] = useState('practice');       // practice | test
  const [questions, setQuestions] = useState([]);
  const [activeSet, setActiveSet] = useState([]);
  const [chapter, setChapter] = useState('All');
  const [testCount, setTestCount] = useState(10);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [skipped, setSkipped] = useState({});

  const [remaining, setRemaining] = useState(0);
  const timer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // 🔄 Always fetch fresh questions.json (no-store + cache-buster)
  useEffect(() => {
    const bust = Date.now();
    fetch(`questions.json?v=${APP_VERSION}&t=${bust}`, { cache: 'no-store' })
      .then(r => { if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d => Array.isArray(d) ? setQuestions(d) : setQuestions(d?.questions ?? []))
      .catch(()=> setErr('Could not load questions.json'))
      .finally(()=> setLoading(false));
  }, []);

  /* derived */
  const total = activeSet.length;
  const attempted = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const unattempted = Math.max(0,total-attempted);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  /* timer */
  const stopTimer = ()=>{ if (timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer = (sec)=>{ stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>{ setRemaining(p=>{ if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; } return p-1; }); }, 1000);
  };

  /* navigation helpers */
  const resetRun = ()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };
  const startPractice = ()=>{ 
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter); 
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); 
  };

  const startTest = ()=>{ 
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const n = Math.max(1, Math.min(requestedN, pool.length));
    const s = pickN(pool, n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz'); 
  };

  /* history persist */
  useEffect(() => {
    if (page !== 'result' || !total) return;
    const entry = {
      id: 'attempt_' + Date.now(),
      timestamp: new Date().toISOString(),
      mode, chapter, total, score,
      percent: total ? Math.round((score/total)*100) : 0,
      durationSec: mode==='test' ? timeForN(total) : null,
      answers: Array.from({length: total}, (_,i)=>answers[i] ?? null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source ?? null}))
    };
    const h = store.get(); h.unshift(entry); store.set(h.slice(0,50));
  }, [page, total, score, answers, activeSet, mode, chapter]);

  /* ----------------- render gates ----------------- */
  if (loading) {
    return (<>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">Loading questions…</main>
    </>);
  }
  if (err) {
    return (<>
      <TopBar page={page} mode={mode} timeLeft={remaining} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
      <main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-600">{err}</main>
    </>);
  }

  /* ----------------- HOME ----------------- */
  if (page==='home') {
    const chapterList = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const requestedN = Math.max(1, parseInt(testCount || 1, 10));
    const effectiveN = Math.min(requestedN, filteredCount || 1);
    const est = timeForN(effectiveN);

    return (
      <>
        <TopBar page={page} mode={mode} timeLeft={remaining}
                onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />

        <GaneshBanner/>

        <main className="relative max-w-6xl mx-auto px-4 py-6">
          <section className="relative rounded-[28px] bg-gradient-to-br from-rose-50 to-white p-[2px] shadow-halo">
            <div className={glassCard}>
              <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>
              <h2 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-gray-900">MCQ Practice for CUET PG Economics</h2>
              <p className="text-gray-700 mt-1">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Chapter Filter</label>
                  <FancySelect value={chapter} onChange={setChapter} options={chapterList}/>
                </div>
                <div>
                  <label className="text-sm">Mode</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} /> Practice
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} /> Test
                    </label>
                  </div>
                </div>
              </div>

              {mode==='test' && (
                <div className="mt-5 grid md:grid-cols-[1fr_auto_auto] items-end gap-4">
                  <div>
                    <label className="text-sm">No. of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max={filteredCount}
                      value={testCount}
                      onChange={e=>setTestCount(e.target.value)}
                      className="w-36 md:w-40 p-2 border rounded-lg bg-white/70 backdrop-blur"
                    />
                    <p className="text-xs text-gray-700 mt-1">
                      Available: {filteredCount}
                      {requestedN > filteredCount && (
                        <span className="ml-2 text-rose-600 font-medium">
                          (Requested {requestedN}, using {effectiveN})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="md:ml-auto">
                    <label className="text-sm block">Time limit</label>
                    <div className="p-2 border rounded bg-white/70 backdrop-blur text-sm w-32 md:w-36 text-center">
                      {fmt(est)}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 flex-wrap">
                {mode==='practice' ? (
                  <button onClick={startPractice} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Practice</button>
                ) : (
                  <button onClick={startTest} className={solidBtn("bg-teal-600 hover:bg-teal-700")}>Start Test</button>
                )}
                <button onClick={()=>setPage('history')} className={glassBtn()}>Review Past Results</button>
                <button onClick={()=>setPage('analytics')} className={glassBtn()}>Analytics</button>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ----------------- QUIZ ----------------- */
  if (page==='quiz'
