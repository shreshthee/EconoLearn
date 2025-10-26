/* ===== EconoLearn – main.jsx (Enhanced: Review Mode, Charts, Dark Mode, Confetti, Time per Q) ===== */
const { useEffect, useMemo, useRef, useState } = React;

/* ---------- Storage ---------- */
const LS_KEY_HISTORY = "econ_mcq_history_v2";
const LS_KEY_SEEN    = "econ_seen_questions_v1";
const LS_KEY_THEME   = "econ_theme_v1";

const store = {
  get(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } },
  set(k, v)        { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ---------- Time helpers ---------- */
const TIME_PER_Q_MIN = 1.2;                   // 1.2 minutes = 72 seconds
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

/* ---------- Theme ---------- */
function getInitialTheme() {
  const saved = store.get(LS_KEY_THEME, null);
  if (saved) return saved;                         // 'light' | 'dark'
  // Prefer system
  const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return sysDark ? 'dark' : 'light';
}
function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
}

/* ---------- Micro-UI helpers ---------- */
const glassCard = "relative overflow-visible rounded-3xl p-6 bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-10px_rgba(239,156,167,.45)] dark:bg-white/10 dark:border-white/10 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,.45)]";
const cardWrap  = "relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-100 via-rose-50 to-rose-100 dark:from-rose-900/30 dark:via-rose-800/20 dark:to-rose-900/30";
const glassBtn  = "ripple touch-press px-4 py-2 rounded-lg border border-white/60 bg-white/70 hover:bg-white text-gray-800 backdrop-blur transition shadow-sm hover:shadow hover:-translate-y-[1px] dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/20";
const solidBtn  = "ripple touch-press px-5 py-2 rounded-lg bg-teal-600 text-white shadow-md hover:brightness-[.98] hover:-translate-y-[1px] transition";

/* ---------- Ripple CSS ---------- */
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

/* ---------- Header & Hero ---------- */
const Header = ({page,onHome,onHistory,onAnalytics,theme,setTheme}) => (
  <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b dark:bg-neutral-900/70 dark:border-neutral-800">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-gray-500 dark:text-gray-300"> — CUET PG Economics</span>
      </h1>
      <div className="flex gap-2 text-sm">
        {page==='home' && <>
          <button className={glassBtn} onClick={onHistory}>Review Past Results</button>
          <button className={glassBtn} onClick={onAnalytics}>Analytics</button>
        </>}
        {page!=='home' && <button className={glassBtn} onClick={onHome}>Home</button>}
        <button
          aria-label="Toggle dark mode"
          className={glassBtn}
          onClick={()=>{ const t = theme==='dark'?'light':'dark'; setTheme(t); applyTheme(t); store.set(LS_KEY_THEME, t); }}
        >
          {theme==='dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <div className="text-center my-6">
    <div className="text-3xl md:text-4xl font-extrabold text-rose-400 dark:text-rose-300">EconoLearn</div>
    <div className="mt-3 inline-block w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]
                    bg-[url('./ganesh.png')] bg-contain bg-no-repeat bg-center opacity-80"></div>
  </div>
);

/* ---------- Selects ---------- */
const NativeSelect = ({value,onChange,options}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
          className="ripple w-full p-2 pr-9 border rounded-lg bg-white/70 backdrop-blur hover:bg-white transition dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/20">
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
      <button ref={ref} type="button" className="ripple w-full text-left p-2 pr-9 border rounded-lg bg-white/70 hover:bg-white transition dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/20"
              onClick={()=>setOpen(v=>!v)}>
        {value}<span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
      </button>
      {open&&(
        <ul ref={list} className="absolute z-30 left-0 right-0 max-h-60 overflow-auto rounded-xl border bg-white/95 backdrop-blur shadow-xl mt-2 dark:bg-neutral-800/95 dark:text-white dark:border-neutral-700">
          {options.map(opt=>(
            <li key={opt} onClick={()=>{onChange(opt); setOpen(false);}}
                className={`px-3 py-2 cursor-pointer hover:bg-teal-50 ${opt===value?'bg-teal-100 text-teal-700 font-medium':''} dark:hover:bg-neutral-700 dark:text-white dark:${opt===value?'bg-neutral-700':''}`}>
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
  return <div className="w-full bg-white/60 h-2 rounded-full shadow-inner dark:bg-white/10">
    <div className="bg-teal-500 h-2 rounded-full transition-all" style={{width:`${pct}%`}}/>
  </div>;
};
const Legend = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs mt-3 text-gray-700 dark:text-gray-300">
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-300"></span>Unattempted</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#32CD32] border border-green-600"></span>Attempted</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-500 border border-violet-600"></span>Marked</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></span>Attempted + Marked</div>
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500 border border-red-600"></span>Skipped</div>
  </div>
);

/* ================================ APP ================================== */
const App = () => {
  /* theme */
  const [theme,setTheme]=useState(getInitialTheme());
  useEffect(()=>applyTheme(theme),[]);

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

  // time tracking
  const [remaining,setRemaining]=useState(0);
  const [perQTime,setPerQTime]=useState([]);        // seconds per index
  const qStartRef=useRef(null);
  const timer=useRef(null);

  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sortBy,setSortBy]=useState('date_desc');

  /* Load data */
  useEffect(()=>{
    fetch('questions.json?v='+Date.now())
      .then(r=>{ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d=>Array.isArray(d)?setQuestions(d):setQuestions(d?.questions??[]))
      .catch(()=>setErr('Could not load questions.json'))
      .finally(()=>setLoading(false));
  },[]);

  // seen IDs to avoid repetition in Test mode
  const seenIds = useMemo(()=>new Set(store.get(LS_KEY_SEEN, [])),[]);
  const addSeen = (arr) => { const now = new Set(store.get(LS_KEY_SEEN, [])); arr.forEach((_,i)=>now.add((_.id??(_.question?.slice(0,64)||'')+'|'+(_.source||'')))); store.set(LS_KEY_SEEN, Array.from(now)); };

  const total = activeSet.length;
  const attemptedCount = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  /* Timer helpers */
  const stopTimer=()=>{if(timer.current){clearInterval(timer.current); timer.current=null;}};
  const startTimer=(sec)=>{stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>setRemaining(p=>{if(p<=1){clearInterval(timer.current); setPage('result'); return 0;} return p-1;}),1000);
  };

  /* Per-question time logging */
  const stampLeavingQuestion = (nextIndex) => {
    if (mode!=='test') return;
    const now = Date.now();
    if (qStartRef.current!=null) {
      const spent = Math.round((now - qStartRef.current)/1000);
      setPerQTime(prev=>{
        const copy = prev.slice();
        copy[current] = (copy[current]||0) + spent;
        return copy;
      });
    }
    qStartRef.current = now;
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); setPerQTime([]); qStartRef.current = Date.now(); };
  const startPractice=()=>{
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz');
  };
  const startTest=()=>{
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10));
    const n = Math.max(1, Math.min(req, pool.length));
    // prefer unseen
    const scoreKey = (q)=> q.id ?? (q.question?.slice(0,64)||'')+'|'+(q.source||'');
    const unseen = pool.filter(q=>!seenIds.has(scoreKey(q)));
    const pickPool = (unseen.length>=n) ? unseen : [...unseen, ...pool.filter(q=>seenIds.has(scoreKey(q)))];
    const s = pickN(pickPool,n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz');
    // record seen after test starts
    addSeen(s);
  };

  /* Save attempt to history (with time per Q) */
  useEffect(()=>{
    if(page!=='result'||!total) return;
    const entry={ id:'attempt_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent:total?Math.round(score/total*100):0,
      durationSec: mode==='test'?timeForN(total):null,
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      timePerQ: perQTime.slice(0,total),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    };
    const h=store.get(LS_KEY_HISTORY, []); h.unshift(entry); store.set(LS_KEY_HISTORY, h.slice(0,50));

    // celebration
    if (entry.percent>=80 && window.confetti) {
      window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  },[page,total,score,answers,activeSet,mode,chapter,perQTime]);

  if(loading) return (<><Header page={page} theme={theme} setTheme={setTheme}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500 dark:text-gray-300">Loading…</main></>);
  if(err) return (<><Header page={page} theme={theme} setTheme={setTheme}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-600">{err}</main></>);

  /* HOME */
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
          theme={theme} setTheme={setTheme}
        />
        <Hero />
        <main className="max-w-5xl mx-auto px-4 pb-14">
          <section className={cardWrap}>
            <div className={glassCard}>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">
                MCQ Practice for CUET PG Economics
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm dark:text-gray-300">Chapter Filter</label>
                  {isIOS
                    ? <NativeSelect value={chapter} onChange={setChapter} options={chapters}/>
                    : <FancySelect  value={chapter} onChange={setChapter} options={chapters}/>}
                </div>
                <div>
                  <label className="text-sm dark:text-gray-300">Mode</label>
                  <div className="flex gap-4 mt-2 dark:text-white">
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} />Practice</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} />Test</label>
                  </div>
                </div>
              </div>

              {mode==='test' && (
                <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <div>
                      <label className="text-sm dark:text-gray-300">No. of Questions</label>
                      <input type="number" min="1" max={filteredCount} value={testCount}
                            onChange={e=>setTestCount(e.target.value)}
                            className="ripple w-32 p-2 border rounded-lg bg-white/70 dark:bg-white/10 dark:text-white dark:border-white/10"/>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-600">(Requested {req}, using {effectiveN})</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm block dark:text-gray-300">Time limit</label>
                      <div className="p-2 border rounded bg-white/70 text-sm w-32 text-center dark:bg-white/10 dark:text-white dark:border-white/10">{fmt(est)}</div>
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
              <div className="mt-8 p-4 rounded-2xl border bg-white/60 dark:bg-white/10 dark:border-white/10">
                <h3 className="font-semibold text-gray-800 dark:text-white">Developer Credits</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Built and designed by <b>Shailesh Kumar</b> with assistance from <b>ChatGPT (GPT-5)</b>.
                  Special thanks to all CUET/DSE/JNU/UOH question paper archives.
                </p>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* QUIZ */
  if(page==='quiz'){
    const q = activeSet[current]; if(!q) return null;
    const unattempted = Math.max(0, activeSet.length - attemptedCount);

    const isAttempted = answers[current]!=null;
    const isMarked = !!marked[current];
    const markClass = isMarked
      ? (isAttempted
          ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
          : "bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800")
      : "bg-white/70 text-gray-800 border-white/60 hover:bg-white dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/20";

    return (
      <>
        <Header page={page} onHome={()=>{stopTimer(); setPage('home');}} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme} setTheme={setTheme}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">Question {current+1} of {activeSet.length}</div>
                <div className="w-1/2"><Progress i={current} total={activeSet.length}/></div>
              </div>

              <section className={cardWrap}>
                <div className={glassCard + " animate-[slide_.35s_ease_both]"}>
                  <div className="absolute right-4 top-4 text-xs text-gray-700 bg-white/70 border border-white/60 rounded-md px-2 py-1 dark:bg-white/10 dark:text-white dark:border-white/10">
                    Attempted: <b>{attemptedCount}</b> • Unattempted: <b>{unattempted}</b>
                  </div>

                  <div className="mb-1 text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">Chapter</div>
                  <div className="mb-4 text-base font-medium dark:text-white">{q.chapter||'—'}</div>

                  <h3 className="text-lg font-semibold leading-relaxed dark:text-white">{q.question}</h3>
                  {q.source && <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Source: {q.source}</div>}

                  <div className="mt-5 grid gap-3">
                    {q.options.map((opt,idx)=>{
                      const active = answers[current]===opt;
                      return (
                        <label key={idx}
                          className={`ripple touch-press flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                      hover:shadow hover:-translate-y-[1px]
                                      bg-white/70 backdrop-blur hover:bg-white ${active?'border-teal-500 ring-1 ring-teal-300':'border-white/60'}
                                      dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/20`}>
                          <input type="radio" name={`q-${current}`} className="accent-teal-500"
                                 checked={active} onChange={()=>{
                                   stampLeavingQuestion(current);       // ensures current gets time if selecting then moving fast
                                   setAnswers(p=>({...p,[current]:opt}));
                                   setSkipped(p=>{const c={...p}; delete c[current]; return c;});
                                 }} />
                          <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button className={glassBtn+" disabled:opacity-50"} disabled={current===0}
                              onClick={()=>{ stampLeavingQuestion(current-1); if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1));}}>Previous</button>
                      <button className={glassBtn} onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>Clear Response</button>
                      <button className={`ripple touch-press px-4 py-2 rounded-lg border backdrop-blur transition shadow-sm hover:shadow hover:-translate-y-[1px] ${markClass}`}
                              onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}>
                        {isMarked ? 'Unmark Review' : 'Mark for Review'}
                      </button>
                    </div>

                    <div className="flex-1" />
                    {current<activeSet.length-1
                      ? <button className={solidBtn} onClick={()=>{ stampLeavingQuestion(current+1); if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1);}}>Next</button>
                      : <button className={solidBtn.replace('bg-teal-600','bg-green-600')} onClick={()=>{ stampLeavingQuestion(current); if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result');}}>Submit</button>}
                  </div>
                </div>
              </section>
            </div>

            {/* Palette + legend */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="rounded-2xl p-4 bg-white/70 border border-white/60 shadow dark:bg-white/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold dark:text-white">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-600':'border-gray-300 text-gray-700'} dark:border-neutral-700 dark:text-white`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const mk=!!marked[i]; const sk=!!skipped[i];
                    const s = answered&&mk ? 'attempted_marked' : (!answered&&mk ? 'marked_only' : (!answered&&sk ? 'skipped' : (answered ? 'attempted':'unattempted')));
                    const base="ripple touch-press w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition-all duration-150 hover:shadow-md hover:scale-[1.05]";
                    const ring=(i===current)?" ring-2 ring-teal-500":""; // focus ring
                    const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600 hover:brightness-95"
                                 : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600 hover:brightness-95"
                                 : s==='skipped'         ? "bg-red-500 text-white border-red-600 hover:brightness-95"
                                 : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600 hover:brightness-95"
                                                         : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700";
                    return <button key={i} onClick={()=>{ stampLeavingQuestion(i); if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i);}} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>
                <Legend />
                <div className="mt-4">
                  <button className={solidBtn.replace('bg-teal-600','bg-green-600')+" w-full"} onClick={()=>{stampLeavingQuestion(current); stopTimer(); setPage('result');}}>Submit Test</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* RESULT with Review Mode highlights */
  if(page==='result'){
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme} setTheme={setTheme}/>
        <Hero/>
        <main className="max-w-6xl mx-auto px-4 pb-10">
          <section className={cardWrap}><div className={glassCard}>
            <h2 className="text-xl font-semibold dark:text-white">Result</h2>
            <p className="mt-1 dark:text-gray-300">Score : {score}/{total} ({percent}%)</p>

            <div className="space-y-3 mt-4">
              {activeSet.map((qq,i)=>{
                const sel=answers[i];
                const ok = sel===qq.answer;
                return (
                  <div key={i} className="p-3 border rounded bg-white/70 dark:bg-white/10 dark:border-white/10">
                    <div className="flex justify-between">
                      <b className="dark:text-white">Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'} dark:${ok?'bg-green-900/30 text-green-200':'bg-red-900/30 text-red-200'}`}>{ok?'Correct':'Incorrect'}</span>
                    </div>
                    {qq.source && <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Source: {qq.source}</div>}

                    {/* Review Mode: show all options with highlights */}
                    <div className="mt-3 grid gap-2">
                      {qq.options.map((opt,idx)=>{
                        const isCorrect = opt===qq.answer;
                        const isYours   = sel===opt;
                        const state =
                          isCorrect && isYours ? 'ok' :
                          isCorrect && !isYours ? 'correct' :
                          !isCorrect && isYours ? 'wrong' : 'neutral';
                        const cls =
                          state==='ok'      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : state==='correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : state==='wrong'   ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        :                      'border-white/60 bg-white/60 dark:bg-white/5 dark:border-white/10';
                        return (
                          <div key={idx} className={`flex items-center gap-3 p-2 border rounded ${cls}`}>
                            <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <span className="text-green-700 dark:text-green-300 text-xs font-semibold">✔ Correct</span>}
                            {isYours && !isCorrect && <span className="text-red-700 dark:text-red-300 text-xs font-semibold">✘ Your choice</span>}
                          </div>
                        );
                      })}
                    </div>

                    {qq.explanation && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><button className={glassBtn} onClick={()=>setPage('home')}>Home</button></div>
          </div></section>
        </main>
      </>
    );
  }

  /* HISTORY */
  if(page==='history'){
    const h=store.get(LS_KEY_HISTORY, []);
    const sorted=[...h].sort((a,b)=>sortBy==='date_desc'? new Date(b.timestamp)-new Date(a.timestamp)
                                      : sortBy==='date_asc'? new Date(a.timestamp)-new Date(b.timestamp)
                                      : sortBy==='score_desc'? (b.percent||0)-(a.percent||0)
                                      : (a.percent||0)-(b.percent||0));
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme} setTheme={setTheme}/>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold dark:text-white">Past Results</h2>
            <select className="ripple border rounded px-2 py-1 bg-white/70 backdrop-blur hover:bg-white dark:bg-white/10 dark:text-white dark:border-white/10"
                    value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>
          {sorted.length===0 ? (
            <div className="text-gray-500 dark:text-gray-300">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map(a=>(
                <details key={a.id} className="rounded-xl border bg-white/70 backdrop-blur dark:bg-white/10 dark:border-white/10">
                  <summary className="ripple cursor-pointer flex items-center justify-between px-4 py-3 border-b hover:bg-white dark:hover:bg-white/10 dark:text-white dark:border-white/10">
                    <div>
                      <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                    </div>
                  </summary>
                  <div className="p-4 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 border rounded bg-white/70 dark:bg-white/5 dark:border-white/10">
                          <div className="flex justify-between">
                            <b className="dark:text-white">Q{i+1}. {q.question}</b>
                            <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'} dark:${ok?'bg-green-900/30 text-green-200':'bg-red-900/30 text-red-200'}`}>{ok?'Correct':'Incorrect'}</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">Chapter: {q.chapter||'—'} • Source: {q.source||'—'} {a.timePerQ?.[i]!=null && `• Time: ${a.timePerQ[i]}s`}</div>
                          <div className="text-sm dark:text-white">Your: {your||'Not answered'} • Correct: <b className="text-green-700 dark:text-green-300">{q.answer}</b></div>
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

  /* ANALYTICS (Chart.js) */
  if(page==='analytics'){
    const hist=store.get(LS_KEY_HISTORY, []);
    const agg={};
    hist.forEach(at=>at.questions.forEach((q,i)=>{
      const ch=q.chapter||'Unknown';
      agg[ch]??={correct:0,total:0,time:0};
      agg[ch].total++;
      if(at.answers[i]===q.answer) agg[ch].correct++;
      const t = Array.isArray(at.timePerQ) ? (at.timePerQ[i]||0) : 0;
      agg[ch].time += t;
    }));
    const rows=Object.entries(agg).map(([ch,{correct,total,time}])=>({ch,correct,total,pct:total?Math.round(correct/total*100):0, avgTime: total?Math.round(time/total):0}))
                   .sort((a,b)=>a.ch.localeCompare(b.ch));

    // prepare datasets
    const labels = rows.map(r=>r.ch);
    const pct    = rows.map(r=>r.pct);
    const corr   = rows.map(r=>r.correct);
    const tot    = rows.map(r=>r.total);
    const avgT   = rows.map(r=>r.avgTime);

    const Charts = () => {
      const c1=useRef(null), c2=useRef(null), c3=useRef(null);
      useEffect(()=>{
        if(!window.Chart) return;
        const charts=[];
        charts.push(new Chart(c1.current,{type:'bar',data:{labels,datasets:[{label:'Accuracy %',data:pct}]},options:{responsive:true,scales:{y:{beginAtZero:true,max:100}}}}));
        charts.push(new Chart(c2.current,{type:'bar',data:{labels,datasets:[
          {label:'Attempted',data:tot},
          {label:'Correct',data:corr}
        ]},options:{responsive:true,scales:{y:{beginAtZero:true}}}}));
        charts.push(new Chart(c3.current,{type:'line',data:{labels,datasets:[{label:'Avg time per question (s)',data:avgT}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}}));
        return ()=>charts.forEach(ch=>ch.destroy());
      },[]);
      return (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white/70 p-4 dark:bg-white/10 dark:border-white/10">
            <h4 className="font-semibold mb-2 dark:text-white">Accuracy by Chapter (%)</h4>
            <canvas ref={c1} height="200"></canvas>
          </div>
          <div className="rounded-xl border bg-white/70 p-4 dark:bg-white/10 dark:border-white/10">
            <h4 className="font-semibold mb-2 dark:text-white">Attempts vs Correct (count)</h4>
            <canvas ref={c2} height="200"></canvas>
          </div>
          <div className="rounded-xl border bg-white/70 p-4 dark:bg-white/10 dark:border-white/10">
            <h4 className="font-semibold mb-2 dark:text-white">Avg Time per Question (seconds)</h4>
            <canvas ref={c3} height="200"></canvas>
          </div>
        </div>
      );
    };

    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme} setTheme={setTheme}/>
        <Hero/>
        <main className="max-w-5xl mx-auto px-4 pb-10">
          <section className={cardWrap}><div className={glassCard}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Analytics Dashboard</h2>
            {rows.length===0 ? <div className="text-gray-500 dark:text-gray-300">No data yet.</div> : <Charts/>}
          </div></section>
        </main>
      </>
    );
  }

  return null;
};

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);