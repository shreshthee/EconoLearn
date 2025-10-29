/* ===== EconoLearn main.jsx (v14) ===== */
const {useEffect, useMemo, useRef, useState} = React;

/* ----------------- Theme controller ----------------- */
const THEME_KEY = 'econ_theme';
const getTheme = () => localStorage.getItem(THEME_KEY) || 'system';
const setTheme = (t) => {
  localStorage.setItem(THEME_KEY, t);
  document.body.setAttribute('data-theme', t);
};

const ThemeDock = ({theme, onChange}) => {
  const opt = (k, label) =>
    <button className="chip" data-active={theme===k} onClick={()=>onChange(k)}>{label}</button>;
  return (
    <div className="dock">
      {opt('light','Light')}
      {opt('dark','Dark')}
      {opt('deep','Deep')}
      {opt('system','System')}
    </div>
  );
};

/* ----------------- Storage helpers ------------------ */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; } catch{ return []; } },
  set(v){ try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch{} }
};

/* ----------------- Time helpers --------------------- */
const TIME_PER_Q_MIN = 1.2;
const timeForN = (n)=> Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = (s)=>{
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` :
             `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ----------------- Utils ---------------------------- */
const shuffle=a=>{const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]];} return b;};
const pickN=(a,n)=> shuffle(a).slice(0,n);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);

/* ----------------- Small UI ------------------------- */
const glassCard = "rounded-2xl border border-white/10 shadow-card bg-[color:var(--card)]";

const Header = ({page,onHome,onHistory,onAnalytics,theme}) => (
  <header className="topbar sticky top-0 z-40">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="font-semibold text-sm md:text-base">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-[color:var(--muted)]"> — CUET PG Economics</span>
      </h1>
      <div className="flex gap-2 text-xs">
        {page==='home'
          ? <>
              <button className="btn btn-ghost" onClick={onHistory}>Review Past Results</button>
              <button className="btn btn-ghost" onClick={onAnalytics}>Analytics</button>
            </>
          : <button className="btn btn-ghost" onClick={onHome}>Home</button>}
      </div>
    </div>
  </header>
);

const Hero = ({theme}) => (
  <div className="text-center my-6">
    <div className="text-3xl md:text-4xl font-extrabold text-rose-400">EconoLearn</div>
    <div className="ganesh-tile mt-3">
      <img src="./ganesh.png" alt="Ganesh" className="w-[180px] h-[180px] object-contain opacity-90" />
    </div>
  </div>
);

/* ----------------- App ------------------------------ */
const App = () => {
  const [theme,setThemeState] = useState(getTheme());
  useEffect(()=>{ setTheme(theme); },[theme]);

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

  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sortBy,setSortBy]=useState('date_desc');

  /* Load data fresh (no SW cache for this file) */
  useEffect(()=>{
    fetch('questions.json?v='+Date.now(), {cache:'no-store'})
      .then(r=>{ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d=>Array.isArray(d)?setQuestions(d):setQuestions(d?.questions??[]))
      .catch(()=>setErr('Could not load questions.json'))
      .finally(()=>setLoading(false));
  },[]);

  const total = activeSet.length;
  const attemptedCount = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  const stopTimer=()=>{ if(timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer=(sec)=>{ stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>setRemaining(p=>{
      if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; }
      return p-1;}),1000);
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };
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

  useEffect(()=>{
    if(page!=='result'||!total) return;
    const entry={ id:'attempt_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent:total?Math.round(score/total*100):0,
      durationSec: mode==='test'?timeForN(total):null,
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    };
    const h=store.get(); h.unshift(entry); store.set(h.slice(0,50));
  },[page,total,score,answers,activeSet,mode,chapter]);

  /* ---------------------------------- RENDER ---------------------------------- */
  if(loading) return (<><Header page={page} theme={theme}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-[color:var(--muted)]">Loading…</main></>);
  if(err)      return (<><Header page={page} theme={theme}/><main className="max-w-6xl mx-auto px-4 py-10 text-center text-rose-500">{err}</main></>);

  /* HOME */
  if(page==='home'){
    const chapters = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];

    return (
      <>
        <Header page={page}
          onHome={()=>setPage('home')}
          onHistory={()=>setPage('history')}
          onAnalytics={()=>setPage('analytics')}
          theme={theme}
        />
        <Hero theme={theme} />

        <main className="max-w-5xl mx-auto px-4 pb-16">
          <section className="halo-wrap overflow-fix">
            <div className={`halo-content ${glassCard} p-6 md:p-8`}>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">MCQ Practice for CUET PG Economics</h2>

              <div className="grid md:grid-cols-[1fr,auto] md:items-center gap-4">
                <div>
                  <label className="text-sm text-[color:var(--muted)]">Chapter Filter</label>
                  <select
                    value={chapter}
                    onChange={e=>setChapter(e.target.value)}
                    className="mt-2 w-full p-2 pr-9 rounded-lg border border-white/10 bg-[color:var(--card)] focus:outline-none"
                  >
                    {chapters.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="mt-1">
                  <label className="text-sm text-[color:var(--muted)] block">Mode</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} />Practice</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')} />Test</label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 flex-wrap">
                {mode==='practice'
                  ? <button className="btn btn-solid" onClick={startPractice}>Start Practice</button>
                  : <button className="btn btn-solid" onClick={startTest}>Start Test</button>}
                <button className="btn btn-ghost" onClick={()=>setPage('history')}>Review Past Results</button>
                <button className="btn btn-ghost" onClick={()=>setPage('analytics')}>Analytics</button>
              </div>
            </div>
          </section>
        </main>

        <ThemeDock theme={theme} onChange={setThemeState}/>
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
          ? "bg-blue-500/90 text-white border-blue-600 hover:bg-blue-600 shadow-md"
          : "bg-violet-500/90 text-white border-violet-600 hover:bg-violet-600 shadow-md")
      : "bg-[color:var(--card)] text-[color:var(--ink)] border-white/10 hover:bg-white/5";

    return (
      <>
        <Header page={page} onHome={()=>{stopTimer(); setPage('home');}} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme}/>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[1fr,290px] gap-6">
            <div className="halo-wrap overflow-fix">
              <div className={`halo-content ${glassCard} p-6`}>
                <div className="absolute right-4 top-4 text-xs text-[color:var(--muted)] bg-white/5 border border-white/10 rounded-md px-2 py-1">
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
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition
                                    border hover:shadow bg-[color:var(--card)]/90 ${active?'border-teal-500 ring-1 ring-teal-300':'border-white/10'}`}>
                        <input type="radio" name={`q-${current}`}
                               className="accent-teal-500"
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
                    <button className="btn btn-ghost disabled:opacity-50" disabled={current===0}
                            onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1));}}>Previous</button>
                    <button className="btn btn-ghost" onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>Clear Response</button>

                    <button
                      aria-pressed={isMarked}
                      className={`btn ${markClass}`}
                      onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                    >
                      {isMarked ? 'Unmark Review' : 'Mark for Review'}
                    </button>
                  </div>

                  <div className="flex-1" />
                  {current<activeSet.length-1
                    ? <button className="btn btn-solid" onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1);}}>Next</button>
                    : <button className="btn btn-solid" style={{background:'#10b981'}} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result');}}>Submit</button>}
                </div>
              </div>
            </div>

            {/* Sidebar with inner rosy glow */}
            <aside className="lg:sticky lg:top-[72px] halo-wrap">
              <div className={`halo-content rounded-2xl p-4 ${glassCard}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Question Palette</h4>
                  {mode==='test' && <span className="text-xs px-2 py-1 rounded border border-white/10 text-[color:var(--muted)]">⏱ {fmt(remaining)}</span>}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSet.map((_,i)=>{
                    const answered = answers[i]!=null; const mk=!!marked[i]; const sk=!!skipped[i];
                    const s = answered&&mk ? 'attempted_marked' : (!answered&&mk ? 'marked_only' : (!answered&&sk ? 'skipped' : (answered ? 'attempted':'unattempted')));
                    const base="w-8 h-8 rounded-md flex items-center justify-center text-sm border shadow-sm transition-all duration-150 hover:shadow-md hover:scale-[1.05]";
                    const ring=(i===current)?" ring-2 ring-teal-500":"";
                    const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600"
                                 : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600"
                                 : s==='skipped'         ? "bg-red-500 text-white border-red-600"
                                 : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600"
                                                         : "bg-[color:var(--card)] text-[color:var(--ink)] border-white/10";
                    return <button key={i} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i);}} className={`${base} ${color} ${ring}`}>{i+1}</button>;
                  })}
                </div>

                {/* Legend tidy */}
                <div className="flex flex-wrap items-center text-xs mt-3 text-[color:var(--muted)] gap-3">
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full bg-[color:var(--card)] border border-white/10" />Unattempted</span>
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full bg-[#32CD32] border border-green-600" />Attempted</span>
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500 border border-violet-600" />Marked</span>
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-600" />Attempted + Marked</span>
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 border border-red-600" />Skipped</span>
                </div>

                <div className="mt-4">
                  <button className="btn btn-solid w-full" style={{background:'#10b981'}} onClick={()=>{stopTimer(); setPage('result');}}>Submit Test</button>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <ThemeDock theme={theme} onChange={setThemeState}/>
      </>
    );
  }

  /* RESULT / HISTORY / ANALYTICS — unchanged layout, themed by vars */
  if(page==='result'){
    const percent = total?Math.round(score/total*100):0;
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme}/>
        <main className="max-w-6xl mx-auto px-4 pb-10">
          <section className="halo-wrap"><div className={`halo-content ${glassCard} p-6`}>
            <h2 className="text-xl font-semibold">Result</h2>
            <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
            <div className="space-y-3 mt-4">
              {activeSet.map((qq,i)=>{
                const sel=answers[i]; const ok=sel===qq.answer;
                return (
                  <div key={i} className="p-3 rounded border border-white/10 bg-[color:var(--card)]">
                    <div className="flex justify-between">
                      <b>Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-600/15 text-green-400':'bg-red-600/15 text-red-400'}`}>{ok?'Correct':'Incorrect'}</span>
                    </div>
                    <p className="text-sm mt-1">Your: {sel||'Not answered'} | Correct: <b className="text-green-400">{qq.answer}</b></p>
                    {qq.explanation && <p className="text-sm text-[color:var(--muted)] mt-1">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><button className="btn btn-ghost" onClick={()=>setPage('home')}>Home</button></div>
          </div></section>
        </main>

        <ThemeDock theme={theme} onChange={setThemeState}/>
      </>
    );
  }

  if(page==='history'){
    const h=store.get();
    const sorted=[...h].sort((a,b)=>sortBy==='date_desc'? new Date(b.timestamp)-new Date(a.timestamp)
                                      : sortBy==='date_asc'? new Date(a.timestamp)-new Date(b.timestamp)
                                      : sortBy==='score_desc'? (b.percent||0)-(a.percent||0)
                                      : (a.percent||0)-(b.percent||0));
    return (
      <>
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme}/>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Past Results</h2>
            <select className="border border-white/10 rounded px-2 py-1 bg-[color:var(--card)]"
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
                <details key={a.id} className="rounded-xl border border-white/10 bg-[color:var(--card)]">
                  <summary className="cursor-pointer flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div>
                      <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                      <div className="text-sm text-[color:var(--muted)]">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                    </div>
                  </summary>
                  <div className="p-4 space-y-2">
                    {a.questions.map((q,i)=>{
                      const your=a.answers[i]; const ok=your===q.answer;
                      return (
                        <div key={i} className="p-3 rounded border border-white/10 bg-[color:var(--card)]">
                          <div className="flex justify-between">
                            <b>Q{i+1}. {q.question}</b>
                            <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-600/15 text-green-400':'bg-red-600/15 text-red-400'}`}>{ok?'Correct':'Incorrect'}</span>
                          </div>
                          <div className="text-sm text-[color:var(--muted)]">Chapter: {q.chapter||'—'} • Source: {q.source||'—'}</div>
                          <div className="text-sm">Your: {your||'Not answered'} • Correct: <b className="text-green-400">{q.answer}</b></div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </main>

        <ThemeDock theme={theme} onChange={setThemeState}/>
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
        <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')} theme={theme}/>
        <main className="max-w-5xl mx-auto px-4 pb-10">
          <section className="halo-wrap"><div className={`halo-content ${glassCard} p-6`}>
            <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
            {rows.length===0 ? <div className="text-[color:var(--muted)]">No data yet.</div> : (
              <div className="space-y-3">
                {rows.map(r=>(
                  <div key={r.ch} className="p-3 rounded-xl border border-white/10 bg-[color:var(--card)]">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{r.ch}</div>
                      <div className="text-sm text-[color:var(--muted)]">{r.correct}/{r.total} correct • {r.pct}%</div>
                    </div>
                    <div className="mt-2 h-3 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500" style={{width:`${r.pct}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div></section>
        </main>

        <ThemeDock theme={theme} onChange={setThemeState}/>
      </>
    );
  }

  return null;
};

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);