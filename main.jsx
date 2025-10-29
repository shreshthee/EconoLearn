const {useEffect,useMemo,useRef,useState} = React;

/* ---------- Constants ---------- */
const TIME_PER_Q_MIN = 1.2; // your rule
const timeForN = n => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = s => {
  const h = Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------- Storage ---------- */
const LS_KEY = "econ_mcq_history_v2";
const store = {
  get(){ try{return JSON.parse(localStorage.getItem(LS_KEY))||[]}catch{return[]}},
  set(v){ try{localStorage.setItem(LS_KEY,JSON.stringify(v))}catch{}}
};

/* ---------- Tiny utils ---------- */
const shuffle = a => { const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]];} return b; };
const pickN   = (a,n) => shuffle(a).slice(0,n);

/* ---------- Basic UI atoms ---------- */
const solidBtn = "btn btn-solid px-4 py-2 rounded-lg shadow-md";

/* ---------- App ---------- */
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

  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sortBy,setSortBy]=useState('date_desc');

  // Load data
  useEffect(()=>{
    fetch('questions.json?v='+Date.now())
      .then(r=>{ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d=>Array.isArray(d)?setQuestions(d):setQuestions(d?.questions??[]))
      .catch(()=>setErr('Could not load questions.json'))
      .finally(()=>setLoading(false));
  },[]);

  // External header buttons
  useEffect(()=>{
    const h = (e)=>{ setPage(e.detail); };
    window.addEventListener('econ-nav',h);
    return ()=>window.removeEventListener('econ-nav',h);
  },[]);

  const total = activeSet.length;
  const attemptedCount = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>activeSet.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[answers,activeSet]);

  const stopTimer=()=>{ if(timer.current){ clearInterval(timer.current); timer.current=null; } };
  const startTimer=(sec)=>{ stopTimer(); setRemaining(sec);
    timer.current=setInterval(()=>setRemaining(p=>{
      if(p<=1){ clearInterval(timer.current); setPage('result'); return 0; }
      return p-1;
    }),1000);
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };

  const startPractice=()=>{
    const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz');
  };
  const startTest=()=>{
    const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req  = Math.max(1, parseInt(testCount||1,10));
    const n    = Math.max(1, Math.min(req, pool.length));
    const s    = pickN(pool,n);
    setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz');
  };

  // Save attempt on Result
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

  if(loading) return (<main className="max-w-6xl mx-auto px-4 py-10 text-center text-slate-400">Loading…</main>);
  if(err)     return (<main className="max-w-6xl mx-auto px-4 py-10 text-center text-rose-500">{err}</main>);

  /* ---------------- HOME ---------------- */
  if(page==='home'){
    const chapters = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
    const filteredCount = chapter==='All'?questions.length:questions.filter(q=>q.chapter===chapter).length;
    const req = Math.max(1, parseInt(testCount||1,10));
    const effectiveN = Math.min(req, filteredCount||1);
    const est = timeForN(effectiveN);

    return (
      <section className="relative">
        <div className="glass-card rounded-3xl p-[1px] shadow-glow">
          <div className="rounded-3xl p-6 md:p-7 glass-inner">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">MCQ Practice for CUET PG Economics</h2>
            <p className="text-[color:var(--sub)] mb-6">Practice chapter-wise Economics PYQs with instant feedback.</p>

            <div className="grid md:grid-cols-[1fr,auto] md:items-end gap-4">
              <div>
                <label className="text-sm text-[color:var(--sub)]">Chapter Filter</label>
                <select
                  className="theme-select w-full mt-1 px-3 py-2 rounded-lg"
                  value={chapter} onChange={e=>setChapter(e.target.value)} >
                  {chapters.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="mt-2 md:mt-0">
                <label className="text-sm text-[color:var(--sub)] block">Mode</label>
                <div className="flex items-center gap-5 mt-1">
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
              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[color:var(--sub)]">No. of Questions</label>
                  <input type="number" min="1" max={filteredCount} value={testCount}
                         onChange={e=>setTestCount(e.target.value)}
                         className="theme-select w-40 mt-1 px-3 py-2 rounded-lg" />
                  <div className="text-xs text-[color:var(--sub)] mt-1">
                    Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-500">(Requested {req}, using {effectiveN})</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[color:var(--sub)] block">Time limit</label>
                  <div className="theme-select w-40 mt-1 px-3 py-2 rounded-lg text-center">{fmt(est)}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {mode==='practice'
                ? <button className={solidBtn} onClick={startPractice}>Start Practice</button>
                : <button className={solidBtn} onClick={startTest}>Start Test</button>}
              <button className="px-4 py-2 rounded-lg border border-white/15 bg-[color:var(--card)]" onClick={()=>setPage('history')}>Review Past Results</button>
              <button className="px-4 py-2 rounded-lg border border-white/15 bg-[color:var(--card)]" onClick={()=>setPage('analytics')}>Analytics</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---------------- QUIZ ---------------- */
  if(page==='quiz'){
    const q = activeSet[current]; if(!q) return null;
    const unattempted = Math.max(0, activeSet.length - attemptedCount);
    const isMarked = !!marked[current];

    const markClass = isMarked
      ? "bg-violet-600 text-white border-violet-600"
      : "bg-[color:var(--card)] text-[color:var(--fg)] border-white/15";

    return (
      <section className="grid lg:grid-cols-[1fr,280px] gap-6">
        <div>
          <div className="mb-3 flex items-center justify-between gap-4 text-sm text-[color:var(--sub)]">
            <div>Question {current+1} of {activeSet.length}</div>
            <div className="h-2 w-1/2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2 bg-teal-500" style={{width:`${Math.round(((current+1)/activeSet.length)*100)}%`}}/>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-[1px]">
            <div className="rounded-3xl p-6 glass-inner">
              <div className="absolute right-6 top-6 text-xs text-[color:var(--sub)] bg-[color:var(--card)]/70 border border-white/10 rounded px-2 py-1">
                Attempted: <b>{attemptedCount}</b> • Unattempted: <b>{unattempted}</b>
              </div>

              <div className="mb-1 text-xs uppercase tracking-wide text-[color:var(--sub)]">Chapter</div>
              <div className="mb-4 text-base font-medium">{q.chapter||'—'}</div>

              <h3 className="text-lg font-semibold leading-relaxed">{q.question}</h3>
              {q.source && <div className="mt-1 text-xs text-[color:var(--sub)]">Source: {q.source}</div>}

              <div className="mt-5 grid gap-3">
                {q.options.map((opt,idx)=>{
                  const active = answers[current]===opt;
                  return (
                    <label key={idx}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
                                  bg-[color:var(--card)] hover:shadow
                                  ${active?'border-teal-500 ring-1 ring-[var(--ring)]':'border-white/15'}`}>
                      <input type="radio" name={`q-${current}`} className="accent-teal-500"
                             checked={active} onChange={()=>{
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
                  <button className="px-4 py-2 rounded-lg border border-white/15 bg-[color:var(--card)] disabled:opacity-50"
                          disabled={current===0}
                          onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1));}}>
                    Previous
                  </button>
                  <button className="px-4 py-2 rounded-lg border border-white/15 bg-[color:var(--card)]"
                          onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>
                    Clear Response
                  </button>
                  <button
                    aria-pressed={isMarked}
                    className={`px-4 py-2 rounded-lg border ${markClass}`}
                    onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                  >
                    {isMarked ? 'Unmark Review' : 'Mark for Review'}
                  </button>
                </div>
                <div className="flex-1" />
                {current<activeSet.length-1
                  ? <button className={solidBtn} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1);}}>Next</button>
                  : <button className={solidBtn+" bg-green-600"} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result');}}>Submit</button>}
              </div>
            </div>
          </div>
        </div>

        {/* Palette + timer */}
        <aside className="lg:sticky lg:top-[84px]">
          <div className="rounded-2xl p-4 bg-[color:var(--card)] border border-white/12 shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Question Palette</h4>
              {mode==='test' && <span className={`text-xs px-2 py-1 rounded border ${remaining<=30?'border-rose-500 text-rose-400':'border-white/20 text-[color:var(--sub)]'}`}>⏱ {fmt(remaining)}</span>}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {activeSet.map((_,i)=>{
                const answered = answers[i]!=null; const mk=!!marked[i]; const sk=!!skipped[i];
                const s = answered&&mk ? 'attempted_marked' : (!answered&&mk ? 'marked_only' : (!answered&&sk ? 'skipped' : (answered ? 'attempted':'unattempted')));
                const base="w-8 h-8 rounded-md flex items-center justify-center text-sm border transition";
                const ring=(i===current)?" ring-2 ring-teal-500":"";
                const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600"
                             : s==='marked_only'     ? "bg-violet-600 text-white border-violet-700"
                             : s==='skipped'         ? "bg-rose-600 text-white border-rose-700"
                             : s==='attempted'       ? "bg-green-500 text-white border-green-600"
                                                     : "bg-[color:var(--card)] text-[color:var(--fg)] border-white/15";
                return <button key={i} onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i);}} className={`${base} ${color} ${ring}`}>{i+1}</button>;
              })}
            </div>
            <div className="mt-4">
              <button className={"w-full "+solidBtn+" bg-green-600"} onClick={()=>{stopTimer(); setPage('result');}}>Submit Test</button>
            </div>
          </div>
        </aside>
      </section>
    );
  }

  /* ---------------- RESULT ---------------- */
  if(page==='result'){
    const percent = total?Math.round(score/total*100):0;
    return (
      <section>
        <div className="glass-card rounded-3xl p-[1px]">
          <div className="rounded-3xl p-6 glass-inner">
            <h2 className="text-xl font-semibold">Result</h2>
            <p className="mt-1">Score : {score}/{total} ({percent}%)</p>
            <div className="space-y-3 mt-4">
              {activeSet.map((qq,i)=>{
                const sel=answers[i]; const ok=sel===qq.answer;
                return (
                  <div key={i} className="p-3 border rounded bg-[color:var(--card)] border-white/12">
                    <div className="flex justify-between">
                      <b>Q{i+1}. {qq.question}</b>
                      <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-rose-100 text-rose-700'}`}>{ok?'Correct':'Incorrect'}</span>
                    </div>
                    <p className="text-sm mt-1">Your: {sel||'Not answered'} | Correct: <b className="text-green-600">{qq.answer}</b></p>
                    {qq.explanation && <p className="text-sm text-[color:var(--sub)] mt-1">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><button className="px-4 py-2 rounded-lg border border-white/15 bg-[color:var(--card)]" onClick={()=>setPage('home')}>Home</button></div>
          </div>
        </div>
      </section>
    );
  }

  /* ---------------- HISTORY ---------------- */
  if(page==='history'){
    const h=store.get();
    const sorted=[...h].sort((a,b)=>sortBy==='date_desc'? new Date(b.timestamp)-new Date(a.timestamp)
                                      : sortBy==='date_asc'? new Date(a.timestamp)-new Date(b.timestamp)
                                      : sortBy==='score_desc'? (b.percent||0)-(a.percent||0)
                                      : (a.percent||0)-(b.percent||0));
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Past Results</h2>
          <select className="theme-select px-2 py-1 rounded" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="score_desc">Score high → low</option>
            <option value="score_asc">Score low → high</option>
          </select>
        </div>
        {sorted.length===0 ? (
          <div className="text-[color:var(--sub)]">No attempts yet.</div>
        ) : (
          <div className="space-y-4">
            {sorted.map(a=>(
              <details key={a.id} className="rounded-xl border border-white/12 bg-[color:var(--card)]">
                <summary className="cursor-pointer flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div>
                    <div className="font-semibold">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                    <div className="text-sm text-[color:var(--sub)]">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                  </div>
                </summary>
                <div className="p-4 space-y-2">
                  {a.questions.map((q,i)=>{
                    const your=a.answers[i]; const ok=your===q.answer;
                    return (
                      <div key={i} className="p-3 border rounded bg-[color:var(--card)] border-white/12">
                        <div className="flex justify-between">
                          <b>Q{i+1}. {q.question}</b>
                          <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-rose-100 text-rose-700'}`}>{ok?'Correct':'Incorrect'}</span>
                        </div>
                        <div className="text-sm text-[color:var(--sub)]">Chapter: {q.chapter||'—'} • Source: {q.source||'—'}</div>
                        <div className="text-sm">Your: {your||'Not answered'} • Correct: <b className="text-green-600">{q.answer}</b></div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    );
  }

  /* ---------------- ANALYTICS ---------------- */
  if(page==='analytics'){
    const hist=store.get(); const agg={};
    hist.forEach(at=>at.questions.forEach((q,i)=>{const ch=q.chapter||'Unknown'; agg[ch]??={correct:0,total:0}; agg[ch].total++; if(at.answers[i]===q.answer) agg[ch].correct++;}));
    const rows=Object.entries(agg).map(([ch,{correct,total}])=>({ch,correct,total,pct:total?Math.round(correct/total*100):0})).sort((a,b)=>a.ch.localeCompare(b.ch));

    return (
      <section className="glass-card rounded-3xl p-[1px]">
        <div className="rounded-3xl p-6 glass-inner">
          <h2 className="text-xl font-semibold mb-4">Chapter-wise Analytics</h2>
          {rows.length===0 ? <div className="text-[color:var(--sub)]">No data yet.</div> : (
            <div className="space-y-3">
              {rows.map(r=>(
                <div key={r.ch} className="p-3 border rounded-xl bg-[color:var(--card)] border-white/12">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.ch}</div>
                    <div className="text-sm text-[color:var(--sub)]">{r.correct}/{r.total} correct • {r.pct}%</div>
                  </div>
                  <div className="mt-2 h-3 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{width:`${r.pct}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);