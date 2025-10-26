/* ===== EconoLearn — main.jsx v13 ===== */
const { useEffect, useMemo, useRef, useState } = React;

/* ---------- Storage ---------- */
const LS_KEY = "econ_mcq_history_v2";
const THEME_KEY = "econ_theme";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch { return []; } },
  set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} }
};

/* ---------- Time helpers ---------- */
const TIME_PER_Q_MIN = 1.2; // 1.2 min = 72s per Q (as you wanted)
const timeForN = (n) => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------- Utils ---------- */
const shuffle=(a)=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
const pickN=(a,n)=>shuffle(a).slice(0,n);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);

/* ---------- Micro-UI helpers ---------- */
const glassCard = "relative overflow-visible rounded-3xl p-6 bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-10px_rgba(239,156,167,.45)]";
const cardWrap  = "relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-100 via-rose-50 to-rose-100";
const glassBtn  = "ripple touch-press px-4 py-2 rounded-lg border border-white/60 bg-white/70 hover:bg-white text-gray-800 backdrop-blur transition shadow-sm hover:shadow hover:-translate-y-[1px]";
const solidBtn  = "ripple touch-press px-5 py-2 rounded-lg bg-teal-600 text-white shadow-md hover:brightness-[.98] hover:-translate-y-[1px] transition";

/* ---------- Ripple CSS (kept) ---------- */
(function injectRippleCSS(){
  if (document.getElementById('ripple-style')) return;
  const style = document.createElement('style');
  style.id = 'ripple-style';
  style.textContent = `
    .ripple{position:relative;overflow:hidden}
    .ripple:after{content:"";position:absolute;inset:0;border-radius:inherit;transform:scale(0);background:rgba(0,0,0,.08);opacity:0;pointer-events:none;transition:transform .35s ease,opacity .45s ease}
    .ripple:active:after{transform:scale(1.2);opacity:1}
    @media(hover:none){.touch-press:active{transform:scale(.98)}}
    @keyframes slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  `;
  document.head.appendChild(style);
})();

/* ---------- Dark mode ---------- */
const useDarkMode = () => {
  const [dark,setDark] = useState(()=>localStorage.getItem(THEME_KEY)==='dark');
  useEffect(()=>{
    const root = document.documentElement;
    if(dark) root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, dark?'dark':'light');
  },[dark]);
  return [dark,setDark];
};

/* ---------- Header & Hero ---------- */
const Header = ({page,onHome,onHistory,onAnalytics}) => {
  const [dark,setDark] = useDarkMode();
  return (
  <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/80 backdrop-blur border-b border-white/60 dark:border-slate-800">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-slate-100">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-gray-500 dark:text-slate-400"> — CUET PG Economics</span>
      </h1>
      <div className="header-buttons text-sm">
        {page==='home' && <>
          <button className={glassBtn} onClick={onHistory}>Review Past Results</button>
          <button className={glassBtn} onClick={onAnalytics}>Analytics</button>
        </>}
        {page!=='home' && <button className={glassBtn} onClick={onHome}>Home</button>}
        <button className={glassBtn} onClick={()=>setDark(v=>!v)}>{dark?'☀️ Light':'🌙 Dark'}</button>
      </div>
    </div>
  </header>
)};

const Hero = () => (
  <div className="hero-centered my-6">
    <div className="text-3xl md:text-4xl font-extrabold text-rose-400 dark:text-rose-300">EconoLearn</div>
    <div className="mt-3 inline-block w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]
                    bg-[url('./ganesh.png')] bg-contain bg-no-repeat bg-center opacity-80"></div>
  </div>
);

/* ---------- Selects ---------- */
const NativeSelect = ({value,onChange,options}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
          className="ripple w-full p-2 pr-9 border rounded-lg bg-white/70 dark:bg-slate-800/70 dark:text-slate-100 dark:border-slate-700 backdrop-blur hover:bg-white transition">
    {options.map(c => <option key={c} value={c}>{c}</option>)}
  </select>
);

const FancySelect = ({value,onChange,options}) => {
  const [open,setOpen]=useState(false);
  const ref = useRef(null); const list=useRef(null);
  useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target)&&list.current&&!list.current.contains(e.target)) setOpen(false)};
                 const k=(e)=>{if(e.key==='Escape') setOpen(false)};
                 document.addEventListener('mousedown',h); document.addEventListener('keydown',k);
                 return ()=>{document.removeEventListener('mousedown',h); document.removeEventListener('keydown',k);}
  },[]);
  return (
    <div className="relative">
      <button ref={ref} type="button" className="ripple w-full text-left p-2 pr-9 border rounded-lg bg-white/70 dark:bg-slate-800/70 dark:text-slate-100 dark:border-slate-700 hover:bg-white transition"
              onClick={()=>setOpen(v=>!v)}>
        {value}<span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
      </button>
      {open&&(
        <ul ref={list} className="absolute z-30 left-0 right-0 max-h-60 overflow-auto rounded-xl border bg-white/95 dark:bg-slate-800/95 dark:text-slate-100 dark:border-slate-700 backdrop-blur shadow-xl mt-2">
          {options.map(opt=>(
            <li key={opt} onClick={()=>{onChange(opt); setOpen(false);}}
                className={`px-3 py-2 cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 ${opt===value?'bg-teal-100 text-teal-700 dark:bg-slate-700 dark:text-white font-medium':''}`}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ---------- Progress & Legend ---------- */
const Progress = ({i,total})=>{
  const pct = total? Math.round(((i+1)/total)*100):0;
  return <div className="w-full bg-white/60 dark:bg-slate-800 h-2 rounded-full shadow-inner">
    <div className="bg-teal-500 h-2 rounded-full transition-all" style={{width:`${pct}%`}}/>
  </div>;
};
const Legend = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs mt-3 text-gray-700 dark:text-slate-300">
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-300 dark:bg-slate-700 dark:border-slate-600"></span>Unattempted</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#32CD32] border border-green-600"></span>Attempted</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-500 border border-violet-600"></span>Marked</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></span>Attempted + Marked</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500 border border-red-600"></span>Skipped</div>
  </div>
);

/* ================================ APP ================================== */
const App = () => {
  const [page,setPage]=useState('home');     // home | quiz | result | history | analytics
  const [mode,setMode]=useState('practice'); // practice | test
  const [questions,setQuestions]=useState([]);
  const [activeSet,setActiveSet]=useState([]);
  const [chapter,setChapter]=useState('All');
  const [testCount,setTestCount]=useState(10);

  const [current,setCurrent]=useState(0);
  const [answers,setAnswers]=useState({});
  const [marked,setMarked]=useState({});
  const [skipped,setSkipped]=useState({});

  const [remaining,setRemaining]=useState(0);
  const timer=useRef(null);

  // per-question time tracking (for test mode analytics)
  const [timeSpent,setTimeSpent]=useState([]);  // seconds array
  const lastTickRef=useRef(null);

  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sortBy,setSortBy]=useState('date_desc');

  /* Load data (network-first) */
  useEffect(()=>{
    fetch('questions.json?v='+Date.now())
      .then(r=>{ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d=>Array.isArray(d)?setQuestions(d):setQuestions(d?.questions??[]))
      .catch(()=>setErr('Could not load questions.json'))
      .finally(()=>setLoading(false));
  },[]);

  const total = activeSet.length;
  const attemptedCount = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  /* ---------- Test timer + per-question time ---------- */
  const stopTimer=()=>{if(timer.current){clearInterval(timer.current); timer.current=null;} lastTickRef.current=null;};
  const startTimer=(sec)=>{stopTimer(); setRemaining(sec); lastTickRef.current=Date.now();
    timer.current=setInterval(()=>{
      setRemaining(p=>{
        const now=Date.now();
        const dt = Math.floor((now - (lastTickRef.current||now))/1000);
        lastTickRef.current=now;
        // accumulate time to current question
        setTimeSpent(ts=>{
          const arr = ts.slice();
          arr[current] = (arr[current]||0) + (dt>0?dt:1);
          return arr;
        });
        if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; }
        return p-1;
      });
    },1000);
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); setTimeSpent([]); lastTickRef.current=null; };
  const startPractice=()=>{
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz');
  };
  const startTest=()=>{
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10));
    const n = Math.max(1, Math.min(req, pool.length));
    const s = pickN(pool,n); setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz');
  };

  // ensure time for question increments on manual navigation (when no global timer running, e.g., practice)
  useEffect(()=>{
    return ()=>stopTimer();
  },[]);

  /* ---------- Save attempt on result ---------- */
  useEffect(()=>{
    if(page!=='result'||!total) return;

    // fire confetti for >=80%
    const percent = total?Math.round(score/total*100):0;
    if (percent>=80 && window.confetti) {
      const burst = (x)=>confetti({particleCount: 80, spread: 65, origin: {x}, colors:["#14b8a6","#ec4899","#22c55e","#60a5fa"]});
      burst(0.2); burst(0.5); burst(0.8);
    }

    const entry={ id:'attempt_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent,
      durationSec: mode==='test'?timeForN(total):null,
      timeSpent: (mode==='test' ? timeSpent.slice(0,total) : null),
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    };
    const h=store.get(); h.unshift(entry); store.set(h.slice(0,50));
  },[page,total,score,answers,activeSet,mode,chapter,timeSpent]);

  if(loading) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">Loading…</main></>);
  if(err) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-600">{err}</main></>);

  /* ======================== HOME ======================== */
  if(page==='home'){
    const chapters = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const req = Math.max(1, parseInt(testCount||1,10));
    const effectiveN = Math.min(req, filteredCount||1);
    const est = timeForN(effectiveN);

    return (
      <>
        <Header page={page}
          onHome={()=>setPage('home')}
          onHistory={()=>setPage('history')}
          onAnalytics={()=>setPage('analytics')}
        />
        <Hero />
        <main className="max-w-5xl mx-auto px-4 pb-14">
          <section className={cardWrap+" dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"}>
            <div className={glassCard+" dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"}>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-slate-100">
                MCQ Practice for CUET PG Economics
              </h2>
              <p className="text-gray-700 dark:text-slate-300 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Chapter Filter</label>
                  {isIOS
                    ? <NativeSelect value={chapter} onChange={setChapter} options={chapters}/>
                    : <FancySelect  value={chapter} onChange={setChapter} options={chapters}/>
                  }
                </div>
                <div>
                  <label className="text-sm">Mode</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} />Practice</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} />Test</label>
                  </div>
                </div>
              </div>

              {mode==='test' && (
                <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <div>
                      <label className="text-sm">No. of Questions</label>
                      <input type="number" min="1" max={filteredCount} value={testCount}
                            onChange={e=>setTestCount(e.target.value)}
                            className="ripple w-32 p-2 border rounded-lg bg-white/70 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-100"/>
                      <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                        Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-600">(Requested {req}, using {effectiveN})</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm block">Time limit</label>
                      <div className="p-2 border rounded bg-white/70 dark:bg-slate-800/70 dark:border-slate-700 text-sm w-32 text-center">{fmt(est)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 flex-wrap">
                {mode==='practice'
                  ? <button className={solidBtn} onClick={startPractice}>Start Practice</button>
                  : <button className={solidBtn} onClick={startTest}>Start Test</button>}
                <button className={glassBtn} onClick={()=>setPage('history')}>Review Past Results</button>
                <button className={glassBtn} onClick={()=>setPage('analytics')}>Analytics</button>
              </div>

              {/* Developer Credits */}
              <div className="mt-8 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-1">Developer Credits</h3>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  Built and designed by <b className="font-semibold">Shailesh Kumar</b> with assistance from <b>ChatGPT (GPT-5)</b>.
                  Special thanks to CUET/DSE/JNU/UOH archives.
                </p>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ======================== QUIZ ======================== */
  if(page==='quiz'){
    const q = activeSet[current]; if(!q) return null;
    const unattempted = Math.max(0, activeSet.length - attemptedCount);
    const isAttempted = answers[current]!=null;
    const isMarked = !!marked[current];
    const markClass = isMarked
      ? (isAttempted
          ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 ring-1 ring-blue-200"
          : "bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 ring-1 ring-violet-200")
      : "bg-white/70 text-gray-800 border-white/60 hover:bg-white";

    const go = (idx) => {
      // accumulate 1s spent in practice too when moving
      setTimeSpent(ts=>{
        const arr = ts.slice();
        arr[current] = (arr[current]||0) + 1; // minimal tick
        return arr;
      });
      setCurrent(idx);
    }

    return (
      <>
        <Header page={page} onHome={()=>{stopTimer(); setPage('home');}} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-slate-300">Question {current+1} of {activeSet.length}</div>
                <div className="w-1/2"><Progress i={current} total={activeSet.length}/></div>
              </div>

              <section className={cardWrap+" dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"}>
                <div className={glassCard + " dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100 animate-[slide_.35s_ease_both]"}>
                  <div className="absolute right-4 top-4 text-xs text-gray-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-slate-700 rounded-md px-2 py-1">
                    Attempted: <b>{attemptedCount}</b> • Unattempted: <b>{unattempted}</b>
                  </div>

                  <div className="mb-1 text-xs uppercase tracking-wide text-gray-700 dark:text-slate-400">Chapter</div>
                  <div className="mb-4 text-base font-medium">{q.chapter||'—'}</div>

                  <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
                  {q.source && <div className="mt-1 text-xs text-gray-700 dark:text-slate-300">Source: {q.source}</div>}

                  <div className="mt-5 grid gap-3">
                    {q.options.map((opt,idx)=>{
                      const active = answers[current]===opt;
                      return (
                        <label key={idx}
                          className={`ripple touch-press flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                      hover:shadow hover:-translate-y-[1px]
                                      bg-white/70 dark:bg-slate-800/70 backdrop-blur hover:bg-white dark:hover:bg-slate-700 ${active?'border-teal-500 ring-1 ring-teal-300':'border-white/60 dark:border-slate-700'}`}>
                          <input type="radio" name={`q-${current}`} className="accent-teal-500"
                                 checked={active} onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{const c={...p}; delete c[current]; return c;}); }} />
                          <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button className={glassBtn+" disabled:opacity-50"} disabled={current===0}
                              onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); go(Math.max(0,current-1));}}>Previous</button>
                      <button className={glassBtn} onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>Clear Response</button>
                      <button className={`ripple touch-press px-4 py-2 rounded-lg border backdrop-blur transition shadow-sm hover:shadow hover:-translate-y-[1px] ${markClass}`}
                              onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}>
                        {isMarked ? 'Unmark Review' : 'Mark for Review'}
                      </button>
                    </div>

                    <div className="flex-1" />
                    {current<activeSet.length-1
                      ? <button className={solidBtn} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); go(current+1);}}>Next</button>
                      : <button className={solidBtn.replace('bg-teal-600','bg-green-600')} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result');}}>Submit</button>}
                  </div>
                </div>
              </section>
            </div>

            {/* Palette + legend */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300'}`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const mk=!!marked[i]; const sk=!!skipped[i];
                    const s = answered&&mk ? 'attempted_marked' : (!answered&&mk ? 'marked_only' : (!answered&&sk ? 'skipped' : (answered ? 'attempted':'unattempted')));
                    const base="ripple touch-press w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition-all duration-150 hover:shadow-md hover:scale-[1.05]";
                    const ring=(i===current)?" ring-2 ring-teal-500":""; // current indicator
                    const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600 hover:brightness-95"
                                 : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600 hover:brightness-95"
                                 : s==='skipped'         ? "bg-red-500 text-white border-red-600 hover:brightness-95"
                                 : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95"
                                                         : "bg-white text-gray-800 dark:bg-slate-800 dark:text-slate-100 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700";
                    return <button key={i} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); go(i);}} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>
                <Legend />
                <div className="mt-4">
                  <button className={solidBtn.replace('bg-teal-600','bg-green-600')+" w-full"} onClick={()=>{stopTimer(); setPage('result');}}>Submit Test</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* ======================== RESULT (Review Mode) ======================== */
  if(page==='result'){
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
        <Hero/>
        <main className="max-w-6xl mx-auto px-4 pb-10">
          <section className={cardWrap+" dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"}><div className={glassCard+" dark:bg-slate-900/60 dark:border-slate-700"}>
            <h2 className="text-xl font-semibold">Result</h2>
            <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
            <div className="space-y-3 mt-4">
              {activeSet.map((qq,i)=>{
                const sel=answers[i];
                return (
                  <div key={i} className="p-3 border rounded bg-white/70 dark:bg-slate-800/70 dark:border-slate-700">
                    <div className="flex justify-between">
                      <b>Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${sel===qq.answer?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{sel===qq.answer?'Correct':'Incorrect'}</span>
                    </div>

                    {/* Review highlighting */}
                    <ul className="mt-3 space-y-2">
                      {qq.options.map((op,idx)=>{
                        const isCorrect = op===qq.answer;
                        const isYour = op===sel;
                        const cls = isCorrect
                          ? "border-green-500 bg-green-50"
                          : (isYour ? "border-red-500 bg-red-50" : "border-white/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70");
                        return (
                          <li key={idx} className={`p-2 border rounded ${cls}`}>
                            <span className="font-medium mr-2">{String.fromCharCode(65+idx)}.</span>{op}
                            {isCorrect && <span className="ml-2 text-green-700 text-xs">✓ Correct</span>}
                            {isYour && !isCorrect && <span className="ml-2 text-red-700 text-xs">Your answer</span>}
                          </li>
                        );
                      })}
                    </ul>

                    <p className="text-sm mt-2">Your: {sel||'Not answered'} • Correct: <b className="text-green-700">{qq.answer}</b></p>
                    {qq.explanation && <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">{qq.explanation}</p>}
                    {Array.isArray(timeSpent) && timeSpent[i]>0 && <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">⏱ Time on this Q: {fmt(timeSpent[i])}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <button className={glassBtn} onClick={()=>setPage('home')}>Home</button>
              <button className={glassBtn+" ml-2"} onClick={()=>setPage('analytics')}>View Analytics</button>
            </div>
          </div></section>
        </main>
      </>
    );
  }

  /* ======================== HISTORY ======================== */
  if(page==='history'){
    const h=store.get();
    const sorted=[...h].sort((a,b)=>sortBy==='date_desc'? new Date(b.timestamp)-new Date(a.timestamp)
                                      : sortBy==='date_asc'? new Date(a.timestamp)-new Date(b.timestamp)
                                      : sortBy==='score_desc'? (b.percent||0)-(a.percent||0)
                                      : (a.percent||0)-(b.percent||0));
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Past Results</h2>
            <select className="ripple border rounded px-2 py-1 bg-white/70 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-100 backdrop-blur hover:bg-white"
                    value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>
          {sorted.length===0 ? (
            <div className="text-gray-500">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map(a=>(
                <details key={a.id} className="rounded-xl border bg-white/70 dark:bg-slate-900/60 dark:border-slate-700 backdrop-blur">
                  <summary className="ripple cursor-pointer flex items-center justify-between px-4 py-3 border-b hover:bg-white dark:hover:bg-slate-800 dark:border-slate-700">
                    <div>
                      <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                      <div className="text-sm text-gray-700 dark:text-slate-300">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                    </div>
                  </summary>
                  <div className="p-4 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 border rounded bg-white/70 dark:bg-slate-800/70 dark:border-slate-700">
                          <div className="flex justify-between">
                            <b>Q{i+1}. {q.question}</b>
                            <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-slate-300">Chapter: {q.chapter||'—'} • Source: {q.source||'—'}</div>
                          <div className="text-sm">Your: {your||'Not answered'} • Correct: <b className="text-green-700">{q.answer}</b></div>
                          {Array.isArray(a.timeSpent)&&a.timeSpent[i]>0 && <div className="text-xs text-gray-600 dark:text-slate-400">⏱ Time: {fmt(a.timeSpent[i])}</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  /* ======================== ANALYTICS (Chart.js) ======================== */
  if(page==='analytics'){
    const hist=store.get();

    // build aggregates
    const chapterAgg = {};
    let totalQ=0, totalCorrect=0;
    hist.forEach(at=>{
      at.questions.forEach((q,i)=>{
        const ch=q.chapter||'Unknown';
        chapterAgg[ch] ??= {correct:0,total:0};
        chapterAgg[ch].total++;
        totalQ++;
        if(at.answers[i]===q.answer){chapterAgg[ch].correct++; totalCorrect++;}
      });
    });
    const chapters = Object.keys(chapterAgg).sort((a,b)=>a.localeCompare(b));
    const acc = chapters.map(ch => Math.round((chapterAgg[ch].correct / chapterAgg[ch].total) * 100));

    // attempts vs correct (overall)
    const attemptsCorrect = [totalQ, totalCorrect];

    // average time per question (test mode entries only)
    const timeData = [];
    const labelsTime = [];
    hist.forEach(at=>{
      if(Array.isArray(at.timeSpent)){
        const avg = at.timeSpent.reduce((a,b)=>a+(b||0),0)/Math.max(1,at.timeSpent.length);
        labelsTime.push(new Date(at.timestamp).toLocaleDateString());
        timeData.push(Math.round(avg));
      }
    });

    // Chart refs
    const accRef = useRef(null);
    const barRef = useRef(null);
    const timeRef = useRef(null);
    const chartObjs = useRef([]);

    useEffect(()=>{
      chartObjs.current.forEach(c=>{try{c.destroy()}catch{}});
      chartObjs.current = [];

      if (accRef.current) {
        const c = new Chart(accRef.current, {
          type: 'bar',
          data: { labels: chapters, datasets: [{ label: 'Accuracy %', data: acc }] },
          options: { responsive:true, scales:{ y:{ beginAtZero:true, max:100 } } }
        });
        chartObjs.current.push(c);
      }
      if (barRef.current) {
        const c2 = new Chart(barRef.current, {
          type: 'bar',
          data: { labels: ['Attempted','Correct'], datasets: [{ label: 'Count', data: attemptsCorrect }] },
          options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
        });
        chartObjs.current.push(c2);
      }
      if (timeRef.current && timeData.length) {
        const c3 = new Chart(timeRef.current, {
          type: 'line',
          data: { labels: labelsTime, datasets: [{ label: 'Avg Time per Q (sec)', data: timeData, tension:.3 }] },
          options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
        });
        chartObjs.current.push(c3);
      }
      return ()=>chartObjs.current.forEach(c=>{try{c.destroy()}catch{}});
    },[]);

    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <Hero/>
        <main className="max-w-5xl mx-auto px-4 pb-10">
          <section className={cardWrap}><div className={glassCard}>
            <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>

            {chapters.length===0 ? <div className="text-gray-500">No data yet.</div> : (
              <div className="space-y-6">
                <div className="p-3 border rounded-xl bg-white/70">
                  <div className="font-semibold mb-2">Accuracy by Chapter</div>
                  <canvas ref={accRef} height="180"></canvas>
                </div>
                <div className="p-3 border rounded-xl bg-white/70">
                  <div className="font-semibold mb-2">Attempts vs Correct (Overall)</div>
                  <canvas ref={barRef} height="160"></canvas>
                </div>
                <div className="p-3 border rounded-xl bg-white/70">
                  <div className="font-semibold mb-2">Average Time per Question (Test sessions)</div>
                  {timeData.length? <canvas ref={timeRef} height="160"></canvas> : <div className="text-sm text-gray-500">No timed test data yet.</div>}
                </div>
              </div>
            )}
          </div></section>
        </main>
      </>
    );
  }

  return null;
};

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);