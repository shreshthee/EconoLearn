/* ===== EconoLearn – main.jsx (stable UI + dark/deep + timer + palette hover) ===== */
const {useEffect,useMemo,useRef,useState} = React;

/* ---------------- Storage helpers ---------------- */
const THEME_KEY = "econ_theme";
const HISTORY_KEY = "econ_mcq_history_v2";
const store = {
  themeGet(){ return localStorage.getItem(THEME_KEY) || "light"; },
  themeSet(v){ localStorage.setItem(THEME_KEY, v); },
  histGet(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [] }catch{ return [] } },
  histSet(v){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(v)) }catch{} },
};

/* ---------------- Time helpers ---------------- */
const TIME_PER_Q_MIN = 1.2;
const secFor = n => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = s=>{
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
  return h? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
};

/* ---------------- Tiny utils ---------------- */
const shuffle=a=>{const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]];} return b;};
const pickN=(arr,n)=>shuffle(arr).slice(0,n);

/* ---------------- Header ---------------- */
const Header = ({onHome,page,onHistory,onAnalytics}) => (
  <header className="sticky top-0 z-20 border-b border-token" style={{background:"var(--card)"}}>
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="text-sm md:text-base ink"><b>EconoLearn</b> <span className="sub">— CUET PG Economics</span></div>
      <div className="flex gap-2">
        {page!=='home' && <button className="btn px-3 py-1.5 rounded border border-token" onClick={onHome}>Home</button>}
        <button className="btn px-3 py-1.5 rounded border border-token" onClick={onHistory}>Review Past Results</button>
        <button className="btn px-3 py-1.5 rounded border border-token" onClick={onAnalytics}>Analytics</button>
      </div>
    </div>
  </header>
);

/* ---------------- Theme Dock ---------------- */
function ThemeDock({theme,setTheme}){
  const opt = t=>(
    <button
      className={`theme-pill ${theme===t?'active':''}`}
      onClick={()=>setTheme(t)}
    >{t[0].toUpperCase()+t.slice(1)}</button>
  );
  return (
    <div className="theme-dock">
      {opt('light')}{opt('dark')}{opt('deep')}
      <button className="theme-pill" onClick={()=>setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}>System</button>
    </div>
  );
}

/* ---------------- Legend (kept) ---------------- */
const LegendItem = ({dot,label}) => (
  <span className="inline-flex items-center gap-1.5 mr-3 mb-1 text-xs sub">
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} />
    {label}
  </span>
);
const Legend = ()=>(
  <div className="mt-3">
    <LegendItem dot="bg-white border border-token" label="Unattempted"/>
    <LegendItem dot="bg-[#32CD32] border border-green-600" label="Attempted"/>
    <LegendItem dot="bg-violet-500 border border-violet-600" label="Marked"/>
    <LegendItem dot="bg-blue-500 border border-blue-600" label="Attempted + Marked"/>
    <LegendItem dot="bg-red-500 border border-red-600" label="Skipped"/>
  </div>
);

/* ---------------- App ---------------- */
function App(){
  /* theme */
  const [theme,setTheme] = useState(store.themeGet());           // light | dark | deep
  useEffect(()=>{
    const cls = theme==='dark'?'theme-dark':theme==='deep'?'theme-deep':'theme-light';
    document.body.classList.remove('theme-light','theme-dark','theme-deep');
    document.body.classList.add(cls);
    store.themeSet(theme);
  },[theme]);

  /* pages */
  const [page,setPage]=useState('home'); // home | quiz | result | history | analytics

  /* data */
  const [questions,setQuestions]=useState([]);
  const [error,setError]=useState('');

  useEffect(()=>{
    fetch('questions.json?v='+Date.now())
      .then(r=>{ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(d=>Array.isArray(d)?setQuestions(d):setQuestions(d?.questions??[]))
      .catch(()=>setError('Could not load questions.json'));
  },[]);

  /* quiz state */
  const [mode,setMode]=useState('practice'); // practice | test
  const [chapter,setChapter]=useState('All');
  const [active,setActive]=useState([]);
  const [current,setCurrent]=useState(0);
  const [answers,setAnswers]=useState({});
  const [marked,setMarked]=useState({});
  const [skipped,setSkipped]=useState({});
  const [testCount,setTestCount]=useState(10);

  /* timer */
  const [remain,setRemain]=useState(0);
  const tRef = useRef(null);
  const stopTimer = ()=>{ if(tRef.current){ clearInterval(tRef.current); tRef.current=null; } };
  const startTimer = (sec)=>{ stopTimer(); setRemain(sec);
    tRef.current=setInterval(()=>setRemain(p=>{
      if(p<=1){ clearInterval(tRef.current); setPage('result'); return 0; }
      return p-1;
    }), 1000);
  };

  const chapters = ['All',...new Set(questions.map(q=>q.chapter).filter(Boolean))];
  const filtered = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);

  /* derived */
  const total = active.length;
  const attempted = useMemo(()=>Object.keys(answers).filter(k=>answers[k]!=null).length,[answers]);
  const score = useMemo(()=>active.reduce((s,q,i)=>s+(answers[i]===q.answer?1:0),0),[active,answers]);

  /* actions */
  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); }
  const startPractice=()=>{ setActive(filtered); resetRun(); stopTimer(); setPage('quiz'); }
  const startTest=()=>{
    const pool = filtered;
    const n = Math.max(1, Math.min(parseInt(testCount||1,10), pool.length));
    setActive(pickN(pool,n)); resetRun(); startTimer(secFor(n)); setPage('quiz');
  }

  /* persist history when showing result */
  useEffect(()=>{
    if(page!=='result' || !total) return;
    const entry={
      id:'a_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent: total? Math.round(score/total*100):0,
      durationSec: mode==='test'? secFor(total) : null,
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      questions: active.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    };
    const hx=store.histGet(); hx.unshift(entry); store.histSet(hx.slice(0,60));
  },[page]);

  /* ---------- Pages ---------- */

  if(error){
    return (<>
      <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-5xl mx-auto px-4 py-12 text-center text-rose-600">{error}</main>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  // HOME
  if(page==='home'){
    const est = mode==='test' ? fmt(secFor(Math.max(1, Math.min(testCount, filtered.length || 1)))) : null;

    return (<>
      <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-rose-400 text-center mt-6 mb-5">EconoLearn</h1>

        {/* Lord Ganesh */}
        <div className="ganesh-frame mb-6">
          <img src="./ganesh.png" alt="Lord Ganesh" className="ganesh-img"/>
        </div>

        {/* Card */}
        <section className="rosy-floor">
          <div className="glass-card p-6 sm:p-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 ink">MCQ Practice for CUET PG Economics</h2>
            <p className="sub">Practice chapter-wise Economics PYQs with instant feedback.</p>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="relative z-50">
                <label className="text-sm sub">Chapter Filter</label>
                <select
                  value={chapter}
                  onChange={e=>setChapter(e.target.value)}
                  className="mt-1 w-full rounded border border-token bg-[var(--card)] px-3 py-2"
                >
                  {chapters.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm sub block">Mode</label>
                <div className="mt-2 flex items-center gap-6">
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')}/> Practice</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={mode==='test'} onChange={()=>setMode('test')}/> Test</label>
                </div>
              </div>
            </div>

            {mode==='test' && (
              <div className="mt-4 flex items-end gap-6">
                <div>
                  <label className="text-sm sub">No. of Questions</label>
                  <input type="number" min="1" className="mt-1 w-28 rounded border border-token bg-[var(--card)] px-3 py-2"
                    value={testCount} onChange={e=>setTestCount(e.target.value)}/>
                  <div className="text-xs sub mt-1">Available: {filtered.length}</div>
                </div>
                <div>
                  <label className="text-sm sub block">Time limit</label>
                  <div className="mt-1 px-3 py-2 w-28 rounded border border-token bg-[var(--card)] text-center">{est}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {mode==='practice'
                ? <button className="btn px-4 py-2 rounded bg-teal-600 text-white" onClick={startPractice}>Start Practice</button>
                : <button className="btn px-4 py-2 rounded bg-teal-600 text-white" onClick={startTest}>Start Test</button>}
              <button className="btn px-4 py-2 rounded border border-token" onClick={()=>setPage('history')}>Review Past Results</button>
              <button className="btn px-4 py-2 rounded border border-token" onClick={()=>setPage('analytics')}>Analytics</button>
            </div>
          </div>
        </section>
      </div>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  // QUIZ
  if(page==='quiz'){
    const q = active[current]; if(!q) return null;

    const attemptedCount = attempted;
    const unattempted = Math.max(0, total - attemptedCount);
    const isMarked = !!marked[current];
    const isAnswered = answers[current]!=null;

    const markClass = isMarked
      ? (isAnswered ? "bg-blue-500 text-white border-blue-600" : "bg-violet-500 text-white border-violet-600")
      : "bg-[var(--card)] text-[var(--ink)] border-token";

    return (<>
      <Header page={page} onHome={()=>{stopTimer(); setPage('home');}} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,300px] gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between sub">
              <div>Question {current+1} of {total}</div>
              {mode==='test' && <div className={`text-xs px-2 py-1 rounded border ${remain<=30?'border-rose-500 text-rose-500':'border-token'}`}>⏱ {fmt(remain)}</div>}
            </div>

            <section className="glass-card p-5">
              <div className="absolute right-4 top-4 text-xs sub bg-[var(--card)] border border-token rounded px-2 py-1">
                Attempted: <b>{attemptedCount}</b> • Unattempted: <b>{unattempted}</b>
              </div>

              <div className="text-xs uppercase sub mb-1">Chapter</div>
              <div className="font-medium mb-3">{q.chapter||'—'}</div>

              <h3 className="text-lg font-semibold ink">{q.question}</h3>
              {q.source && <div className="mt-1 text-xs sub">Source: {q.source}</div>}

              <div className="mt-4 grid gap-3">
                {q.options.map((opt,idx)=>{
                  const active = answers[current]===opt;
                  return (
                    <label key={idx}
                      className={`qp-btn flex items-center gap-3 p-3 rounded border cursor-pointer bg-[var(--card)] ${active?'border-teal-500 ring-1 ring-teal-300':'border-token'}`}>
                      <input type="radio" name={`q-${current}`} className="accent-teal-600"
                        checked={active} onChange={()=>{ setAnswers(p=>({...p,[current]:opt})); setSkipped(p=>{const c={...p}; delete c[current]; return c;}); }}/>
                      <span className="font-medium">{String.fromCharCode(65+idx)}.</span>
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <button className="btn px-4 py-2 rounded border border-token disabled:opacity-50"
                  disabled={current===0}
                  onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>Math.max(0,c-1)); }}>
                  Previous
                </button>

                <button className="btn px-4 py-2 rounded border border-token"
                  onClick={()=>setAnswers(p=>{const c={...p}; delete c[current]; return c;})}>
                  Clear Response
                </button>

                <button
                  aria-pressed={isMarked}
                  className={`btn px-4 py-2 rounded border ${markClass}`}
                  onClick={()=>setMarked(p=>({...p,[current]:!p[current]}))}
                >
                  {isMarked?'Unmark Review':'Mark for Review'}
                </button>

                <div className="flex-1" />
                {current<total-1
                  ? <button className="btn px-4 py-2 rounded bg-teal-600 text-white"
                      onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(c=>c+1); }}>
                      Next
                    </button>
                  : <button className="btn px-4 py-2 rounded bg-green-600 text-white"
                      onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); stopTimer(); setPage('result'); }}>
                      Submit
                    </button>}
              </div>
            </section>
          </div>

          {/* Right: palette */}
          <aside className="lg:sticky lg:top-20">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold ink">Question Palette</h4>
                {mode==='test' && <span className="text-xs sub">⏱ {fmt(remain)}</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {active.map((_,i)=>{
                  const answered = answers[i]!=null, mk=!!marked[i], sk=!!skipped[i];
                  const s = answered&&mk ? 'attempted_marked'
                        : (!answered&&mk ? 'marked_only'
                        : (!answered&&sk ? 'skipped'
                        : (answered ? 'attempted':'unattempted')));
                  const base="qp-btn w-9 h-9 rounded-md flex items-center justify-center text-sm border";
                  const ring=(i===current)?" ring-2 ring-teal-500":"";
                  const color = s==='attempted_marked' ? "bg-blue-500 text-white border-blue-600"
                               : s==='marked_only'     ? "bg-violet-500 text-white border-violet-600"
                               : s==='skipped'         ? "bg-rose-500 text-white border-rose-600"
                               : s==='attempted'       ? "bg-[#32CD32] text-white border-green-600"
                                                       : "bg-[var(--card)] text-[var(--ink)] border-token";
                  return (
                    <button key={i}
                      className={`${base} ${color} ${ring}`}
                      onClick={()=>{ if(!answers[current]&&!marked[current]) setSkipped(p=>({...p,[current]:true})); setCurrent(i); }}>
                      {i+1}
                    </button>
                  );
                })}
              </div>
              <Legend/>
              <button className="btn mt-4 w-full px-4 py-2 rounded bg-green-600 text-white"
                onClick={()=>{ stopTimer(); setPage('result'); }}>
                Submit Test
              </button>
            </div>
          </aside>
        </div>
      </main>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  // RESULT
  if(page==='result'){
    const percent = total? Math.round(score/total*100):0;
    return (<>
      <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold ink">Result</h2>
          <p className="mt-1 sub">Score: {score}/{total} ({percent}%)</p>
          <div className="space-y-3 mt-4">
            {active.map((qq,i)=>{
              const sel = answers[i]; const ok = sel===qq.answer;
              return (
                <div key={i} className="rounded border border-token bg-[var(--card)] p-3">
                  <div className="flex justify-between">
                    <b>Q{i+1}. {qq.question}</b>
                    <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-rose-100 text-rose-700'}`}>{ok?'Correct':'Incorrect'}</span>
                  </div>
                  <p className="text-sm sub mt-1">Your: {sel||'Not answered'} • Correct: <b className="text-green-600">{qq.answer}</b></p>
                  {qq.explanation && <p className="text-sm sub mt-1">{qq.explanation}</p>}
                </div>
              );
            })}
          </div>
          <button className="btn mt-4 px-4 py-2 rounded border border-token" onClick={()=>setPage('home')}>Home</button>
        </section>
      </main>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  // HISTORY
  if(page==='history'){
    const [sortBy,setSortBy]=useState('date_desc');
    const h=store.histGet();
    const sorted=[...h].sort((a,b)=>sortBy==='date_desc'? new Date(b.timestamp)-new Date(a.timestamp)
                                  : sortBy==='date_asc'? new Date(a.timestamp)-new Date(b.timestamp)
                                  : sortBy==='score_desc'? (b.percent||0)-(a.percent||0)
                                  : (a.percent||0)-(b.percent||0));
    return (<>
      <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold ink">Past Results</h2>
          <select className="border border-token bg-[var(--card)] px-2 py-1 rounded"
            value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="score_desc">Score high → low</option>
            <option value="score_asc">Score low → high</option>
          </select>
        </div>
        {sorted.length===0 ? <div className="sub">No attempts yet.</div> : (
          <div className="space-y-3">
            {sorted.map(a=>(
              <details key={a.id} className="rounded border border-token bg-[var(--card)]">
                <summary className="cursor-pointer px-4 py-3 border-b border-token flex items-center justify-between">
                  <div>
                    <div className="font-semibold ink">{new Date(a.timestamp).toLocaleString()} • {a.mode} • {a.chapter}</div>
                    <div className="text-sm sub">Score: {a.score}/{a.total} ({a.percent}%) {a.durationSec?`• Time: ${fmt(a.durationSec)}`:''}</div>
                  </div>
                </summary>
                <div className="p-4 space-y-2">
                  {a.questions.map((q,i)=>{
                    const your=a.answers[i]; const ok=your===q.answer;
                    return (
                      <div key={i} className="p-3 rounded border border-token bg-[var(--card)]">
                        <div className="flex justify-between">
                          <b>Q{i+1}. {q.question}</b>
                          <span className={`text-xs px-2 py-1 rounded ${ok?'bg-green-100 text-green-700':'bg-rose-100 text-rose-700'}`}>{ok?'Correct':'Incorrect'}</span>
                        </div>
                        <div className="text-sm sub">Chapter: {q.chapter||'—'} • Source: {q.source||'—'}</div>
                        <div className="text-sm sub">Your: {your||'Not answered'} • Correct: <b className="text-green-600">{q.answer}</b></div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        )}
      </main>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  // ANALYTICS
  if(page==='analytics'){
    const hist=store.histGet(); const agg={};
    hist.forEach(at=>at.questions.forEach((q,i)=>{const ch=q.chapter||'Unknown'; agg[ch]??={c:0,t:0}; agg[ch].t++; if(at.answers[i]===q.answer) agg[ch].c++;}));
    const rows=Object.entries(agg).map(([ch,{c,t}])=>({ch,c,t,pct:t?Math.round(c/t*100):0})).sort((a,b)=>a.ch.localeCompare(b.ch));

    return (<>
      <Header page={page} onHome={()=>setPage('home')} onHistory={()=>setPage('history')} onAnalytics={()=>setPage('analytics')}/>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold ink mb-3">Chapter-wise Analytics</h2>
        {rows.length===0 ? <div className="sub">No data yet.</div> : (
          <div className="space-y-3">
            {rows.map(r=>(
              <div key={r.ch} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold ink">{r.ch}</div>
                  <div className="sub text-sm">{r.c}/{r.t} correct • {r.pct}%</div>
                </div>
                <div className="mt-2 h-3 w-full bg-gray-200/40 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600" style={{width:`${r.pct}%`}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <ThemeDock theme={theme} setTheme={setTheme}/>
    </>);
  }

  return null;
}

/* mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);