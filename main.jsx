/* EconoLearn – main.jsx (UI restored, dark/deep Ganesh frame, palette hover, fixed timer & z-index) */
const {useEffect,useMemo,useRef,useState} = React;

/* ---------- Local storage ---------- */
const LS_KEY="econ_mcq_history_v2";
const store={
  get(){try{return JSON.parse(localStorage.getItem(LS_KEY))??[]}catch{return[]}},
  set(v){try{localStorage.setItem(LS_KEY,JSON.stringify(v))}catch{}}
};

/* ---------- Time helpers ---------- */
const TIME_PER_Q_MIN=1.2;
const timeForN = n => Math.round(n*TIME_PER_Q_MIN*60);
const fmt = s=>{
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------- Utils ---------- */
const shuffle=a=>{const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]];} return b;};
const pickN=(a,n)=>shuffle(a).slice(0,n);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);

/* ---------- Header ---------- */
const Header=({page,onHome,onHistory,onAnalytics})=>(
  <header className="sticky top-0 z-50 bg-[color:var(--card)]/90 border-b border-white/10 backdrop-blur">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-[color:var(--muted)]"> — CUET PG Economics</span>
      </h1>
      <div className="flex gap-2 text-sm">
        {page==='home' ? (
          <>
            <button className="ripple rounded-lg px-3 py-1.5 theme-chip hover:opacity-95" onClick={onHistory}>Review Past Results</button>
            <button className="ripple rounded-lg px-3 py-1.5 theme-chip hover:opacity-95" onClick={onAnalytics}>Analytics</button>
          </>
        ) : (
          <button className="ripple rounded-lg px-3 py-1.5 theme-chip hover:opacity-95" onClick={onHome}>Home</button>
        )}
      </div>
    </div>
  </header>
);

/* ---------- Ganesh ---------- */
const Ganesh=({theme})=>{
  const frameCls = theme==='light' ? "rounded-2xl p-3" : "ganesh-frame rounded-2xl";
  return (
    <div className="text-center my-6">
      <div className="text-3xl md:text-4xl font-extrabold text-rose-400">EconoLearn</div>
      <div className="mt-3 inline-block">
        <div className={frameCls}>
          <img src="./ganesh.png" alt="Lord Ganesh" className="w-[200px] h-[200px] object-contain select-none" />
        </div>
      </div>
    </div>
  );
};

/* ---------- Theme floating tray ---------- */
const ThemeTray=({theme,setTheme})=>{
  const Btn = ({id,label})=>(
    <button
      className={`ripple theme-chip px-3 py-1.5 rounded-full text-sm ${theme===id?'active':''}`}
      onClick={()=>setTheme(id)}
      aria-pressed={theme===id}
    >{label}</button>
  );
  return (
    <div className="theme-tray flex gap-2 bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/10">
      <Btn id="light" label="Light"/>
      <Btn id="dark" label="Dark"/>
      <Btn id="deep" label="Deep"/>
      <Btn id="system" label="System"/>
    </div>
  );
};

/* ---------- Progress ---------- */
const Progress=({i,total})=>{
  const pct = total? Math.round(((i+1)/total)*100):0;
  return (
    <div className="w-full h-2 rounded-full bg-white/10">
      <div className="h-2 rounded-full" style={{width:`${pct}%`, background:'var(--accent)'}}/>
    </div>
  );
};

/* ================================ APP ================================== */
const App=()=>{
  /* Theme */
  const [theme,setThemeRaw]=useState('system');
  const setTheme = (t)=>{
    setThemeRaw(t);
    const wrap=document.getElementById('root-wrap');
    wrap.classList.remove('theme-dark','theme-deep');
    const want = t==='system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : t;
    if(want==='dark') wrap.classList.add('theme-dark');
    if(want==='deep') wrap.classList.add('theme-deep');
  };
  useEffect(()=>{
    setTheme('system');
    const m=window.matchMedia('(prefers-color-scheme: dark)');
    const h=()=>{ if(theme==='system') setTheme('system'); };
    m.addEventListener?.('change',h); return ()=>m.removeEventListener?.('change',h);
  },[]);

  /* Navigation & data */
  const [page,setPage]=useState('home'); // home | quiz | result | history | analytics
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

  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sortBy,setSortBy]=useState('date_desc');

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

  const stopTimer=()=>{if(timer.current){clearInterval(timer.current); timer.current=null;}};
  const startTimer=(sec)=>{stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>setRemaining(p=>{
      if(p<=1){clearInterval(timer.current); setPage('result'); return 0;}
      return p-1;
    }),1000);
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };

  /* Start buttons */
  const startPractice=()=>{
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz');
  };
  const startTest=()=>{
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10));
    const n = Math.max(1, Math.min(req, pool.length));
    const s = pickN(pool,n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz');
  };

  /* Save history at result */
  useEffect(()=>{
    if(page!=='result'||!total) return;
    const entry={
      id:'attempt_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent: total?Math.round(score/total*100):0,
      durationSec: mode==='test'? timeForN(total): null,
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    };
    const h=store.get(); h.unshift(entry); store.set(h.slice(0,50));
  },[page,total,score,answers,activeSet,mode,chapter]);

  if(loading) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-[color:var(--muted)]">Loading…</main></>);
  if(err) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-red-500">{err}</main></>);

  /* HOME */
  if(page==='home'){
    const chapters = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const req = Math.max(1, parseInt(testCount||1,10));
    const effectiveN = Math.min(req, filteredCount||1);
    const est = timeForN(effectiveN);
    const wrapTheme = document.getElementById('root-wrap').classList.contains('theme-dark') ? 'dark'
                    : document.getElementById('root-wrap').classList.contains('theme-deep') ? 'deep' : 'light';

    return (
      <>
        <Header page={page}
          onHome={()=>setPage('home')}
          onHistory={()=>setPage('history')}
          onAnalytics={()=>setPage('analytics')}
        />
        <Ganesh theme={wrapTheme}/>
        <main className="max-w-5xl mx-auto px-4 pb-16">
          <section className="glass-card rounded-3xl p-6 overflow-visible soft-rose animate-[slide_.35s_ease_both]">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-1">MCQ Practice for CUET PG Economics</h2>
            <p className="text-[color:var(--muted)]">Practice chapter-wise Economics PYQs with instant feedback.</p>

            {/* Controls */}
            <div className="mt-6 grid md:grid-cols-[1fr,auto] gap-6 items-end">
              <div className="z-60">
                <label className="text-sm">Chapter Filter</label>
                <select
                  className="mt-1 w-full rounded-lg px-3 py-2 bg-white/70 dark:bg-white/10 border border-white/20 text-[color:var(--text)]"
                  value={chapter} onChange={e=>setChapter(e.target.value)}
                >
                  {chapters.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm block">Mode</label>
                <div className="flex items-center gap-5 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mode" checked={mode==='practice'} onChange={()=>setMode('practice')} />Practice</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mode" checked={mode==='test'} onChange={()=>setMode('test')} />Test</label>
                </div>
              </div>
            </div>

            {mode==='test' && (
              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <label className="text-sm">No. of Questions</label>
                  <input type="number" min="1" max={filteredCount} value={testCount}
                    onChange={e=>setTestCount(e.target.value)}
                    className="mt-1 w-32 px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 border border-white/20"/>
                  <div className="text-xs text-[color:var(--muted)] mt-1">
                    Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-500">(Requested {req}, using {effectiveN})</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm block">Time limit</label>
                  <div className="mt-1 px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 border border-white/20 text-sm w-32 text-center">{fmt(est)}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-wrap">
              {mode==='practice'
                ? <button className="ripple px-5 py-2 rounded-lg text-white shadow-md" style={{background:'var(--accent)'}} onClick={startPractice}>Start Practice</button>
                : <button className="ripple px-5 py-2 rounded-lg text-white shadow-md" style={{background:'var(--accent)'}} onClick={startTest}>Start Test</button>}
              <button className="ripple rounded-lg px-4 py-2 theme-chip" onClick={()=>setPage('history')}>Review Past Results</button>
              <button className="ripple rounded-lg px-4 py-2 theme-chip" onClick={()=>setPage('analytics')}>Analytics</button>
            </div>
          </section>
        </main>
        <ThemeTray theme={theme} setTheme={setTheme}/>
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
          ? "bg-blue-600 text-white border-blue-700 hover:brightness-95"
          : "bg-violet-600 text-white border-violet-700 hover:brightness-95")
      : "bg-white/70 text-[color:var(--text)] border-white/40 hover:bg-white";

    return (
      <>
        <Header page={page} onHome={()=>{stopTimer(); setPage('home');}} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="text-sm text-[color:var(--muted)]">Question {current+1} of {activeSet.length}</div>
                <div className="w-1/2"><Progress i={current} total={activeSet.length}/></div>
              </div>

              <section className="glass-card rounded-3xl p-6 overflow-visible animate-[slide_.35s_ease_both]">
                <div className="absolute right-4 top-4 text-xs text-[color:var(--muted)] bg-white/10 border border-white/20 rounded-md px-2 py-1">
                  Attempted: <b>{attemptedCount}</b> • Unattempted: <b>{unattempted}</b>
                </div>

                <div className="mb-1 text-xs uppercase tracking-wide text-[color:var(--muted)]">Chapter</div>
                <div className="mb-4 text-base font-medium">{q.chapter||'—'}</div>

                <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
                {q.source && <div className="mt-1 text-xs text-[color:var(--muted)]">Source: {q.source}</div>}

                <div className="mt-5 grid gap-3">
                  {q.options.map((opt,idx)=>{
                    const active = answers[current]===opt;
                    return (
                      <label key={idx}
                        className={`ripple touch-press flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition hover:shadow hover:-translate-y-[1px]
                                    bg-white/70 dark:bg-white/10 backdrop-blur hover:bg-white/80 ${active?'border-teal-500 ring-1 ring-teal-300':'border-white/40'}`}>
                        <input type="radio" name={`q-${current}`} className="accent-teal-500"
                               checked={active}
                               onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{const c={...p}; delete c[current]; return c;}); }} />
                        <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="ripple rounded-lg px-4 py-2 theme-chip disabled:opacity-50" disabled={current===0}
                            onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1));}}>Previous</button>
                    <button className="ripple rounded-lg px-4 py-2 theme-chip" onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>Clear Response</button>
                    <button aria-pressed={isMarked}
                            className={`ripple rounded-lg px-4 py-2 border ${markClass}`}
                            onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}>
                      {isMarked ? 'Unmark Review' : 'Mark for Review'}
                    </button>
                  </div>
                  <div className="flex-1" />
                  {current<activeSet.length-1
                    ? <button className="ripple px-5 py-2 rounded-lg text-white" style={{background:'var(--accent)'}}
                              onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1);}}>Next</button>
                    : <button className="ripple px-5 py-2 rounded-lg text-white bg-green-600 hover:brightness-95"
                              onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result');}}>Submit</button>}
                </div>
              </section>
            </div>

            {/* Palette + legend */}
            <aside className="lg:sticky lg:top-[72px]">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-red-500 text-red-500':'border-white/30 text-[color:var(--muted)]'}`}>⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const mk=!!marked[i]; const sk=!!skipped[i];
                    const state = answered&&mk ? 'attempted_marked' : (!answered&&mk ? 'marked_only' : (!answered&&sk ? 'skipped' : (answered ? 'attempted':'unattempted')));
                    const base="ripple pal-btn w-9 h-9 rounded-md flex items-center justify-center text-sm border transition-all";
                    const ring=(i===current)?" ring-2 ring-teal-500":"";
                    const color = state==='attempted_marked' ? "bg-blue-600 text-white border-blue-700"
                                 : state==='marked_only'     ? "bg-violet-600 text-white border-violet-700"
                                 : state==='skipped'         ? "bg-red-600 text-white border-red-700"
                                 : state==='attempted'       ? "bg-emerald-600 text-white border-emerald-700"
                                                             : "bg-white/80 text-[color:var(--text)] border-white/40";
                    return <button key={i} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i);}} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center text-xs mt-3 gap-x-4 gap-y-1 text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border border-white/40"></span>Unattempted</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-emerald-700"></span>Attempted</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-600 border border-violet-700"></span>Marked</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-700"></span>Attempted + Marked</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-700"></span>Skipped</span>
                </div>

                <div className="mt-4">
                  <button className="ripple w-full px-5 py-2 rounded-lg text-white bg-green-600 hover:brightness-95" onClick={()=>{stopTimer(); setPage('result');}}>Submit Test</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
        <ThemeTray theme={theme} setTheme={setTheme}/>
      </>
    );
  }

  /* RESULT */
  if(page==='result'){
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
        <main className="max-w-6xl mx-auto px-4 pb-10">
          <section className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold">Result</h2>
            <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
            <div className="space-y-3 mt-4">
              {activeSet.map((qq,i)=>{
                const sel=answers[i]; const ok=sel===qq.answer;
                return (
                  <div key={i} className="p-3 border rounded bg-white/70 dark:bg-white/10 border-white/30">
                    <div className="flex justify-between">
                      <b>Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                    </div>
                    <p className="text-sm mt-1">Your: {sel||'Not answered'} | Correct: <b className="text-green-700">{qq.answer}</b></p>
                    {qq.explanation && <p className="text-sm text-[color:var(--muted)] mt-1">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><button className="ripple theme-chip rounded-lg px-4 py-2" onClick={()=>setPage('home')}>Home</button></div>
          </section>
        </main>
        <ThemeTray theme={theme} setTheme={setTheme}/>
      </>
    );
  }

  /* HISTORY */
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
            <select className="ripple border rounded px-2 py-1 bg-white/70 dark:bg-white/10 border-white/20"
                    value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>
          {sorted.length===0 ? (
            <div className="text-[color:var(--muted)]">No attempts yet.</div>
          ) : (
            <div className="space-y-4">
              {sorted.map(a=>(
                <details key={a.id} className="rounded-xl border bg-white/70 dark:bg-white/10 border-white/20">
                  <summary className="ripple cursor-pointer flex items-center justify-between px-4 py-3 border-b hover:bg-white/80 dark:hover:bg-white/5">
                    <div>
                      <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                      <div className="text-sm text-[color:var(--muted)]">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                    </div>
                  </summary>
                  <div className="p-4 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 border rounded bg-white/70 dark:bg-white/10 border-white/20">
                          <div className="flex justify-between">
                            <b>Q{i+1}. {q.question}</b>
                            <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{ok?'Correct':'Incorrect'}</span>
                          </div>
                          <div className="text-sm text-[color:var(--muted)]">Chapter: {q.chapter||'—'} • Source: {q.source||'—'}</div>
                          <div className="text-sm">Your: {your||'Not answered'} • Correct: <b className="text-green-700">{q.answer}</b></div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </main>
        <ThemeTray theme={theme} setTheme={setTheme}/>
      </>
    );
  }

  /* ANALYTICS */
  if(page==='analytics'){
    const hist=store.get(); const agg={};
    hist.forEach(at=>at.questions.forEach((q,i)=>{const ch=q.chapter||'Unknown'; agg[ch]??={correct:0,total:0}; agg[ch].total++; if(at.answers[i]===q.answer) agg[ch].correct++;}));
    const rows=Object.entries(agg).map(([ch,{correct,total}])=>({ch,correct,total,pct:total?Math.round(correct/total*100):0}))
                   .sort((a,b)=>a.ch.localeCompare(b.ch));

    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} />
        <main className="max-w-5xl mx-auto px-4 pb-10">
          <section className="glass-card rounded-3xl p-6 soft-rose">
            <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
            {rows.length===0 ? <div className="text-[color:var(--muted)]">No data yet.</div> : (
              <div className="space-y-3">
                {rows.map(r=>(
                  <div key={r.ch} className="p-3 border rounded-xl bg-white/70 dark:bg-white/10 border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{r.ch}</div>
                      <div className="text-sm text-[color:var(--muted)]">{r.correct}/{r.total} correct • {r.pct}%</div>
                    </div>
                    <div className="mt-2 h-3 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full" style={{width:`${r.pct}%`, background:'var(--accent)'}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
        <ThemeTray theme={theme} setTheme={setTheme}/>
      </>
    );
  }

  return null;
};

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);