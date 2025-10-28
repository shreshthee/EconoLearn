/* ===== EconoLearn – main.jsx v12 ===== */
const { useEffect, useMemo, useRef, useState } = React;

/* ---------- Persistent storage ---------- */
const LS_KEY = "econ_mcq_history_v2";
const THEME_KEY = "econ_theme"; // 'light' | 'dark' | 'deep' | 'system'
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; }catch{ return []; } },
  set(v){ try{ localStorage.setItem(LS_KEY, JSON.stringify(v)); }catch{} }
};

/* ---------- Time helpers ---------- */
const TIME_PER_Q_MIN = 1.2;
const timeForN = n => Math.round(n * TIME_PER_Q_MIN * 60);
const fmt = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------- Utilities ---------- */
const shuffle = (a)=>{const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]];} return b;};
const pickN = (a,n)=> shuffle(a).slice(0,n);

/* ---------- Theming ---------- */
function applyTheme(mode){
  const html = document.documentElement;
  html.classList.remove('light','dark','deep');
  if (mode==='system'){
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.add(prefersDark?'dark':'light');
  } else {
    html.classList.add(mode);
  }
}
function useTheme(){
  const [theme,setTheme] = useState(localStorage.getItem(THEME_KEY) || 'system');
  useEffect(()=>{ applyTheme(theme); localStorage.setItem(THEME_KEY, theme); },[theme]);
  useEffect(()=>{
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = ()=> theme==='system' && applyTheme('system');
    mq.addEventListener?.('change', h);
    return ()=> mq.removeEventListener?.('change', h);
  },[theme]);
  return [theme,setTheme];
}

/* ---------- Micro-UI helpers ---------- */
const glassCard = "relative overflow-visible rounded-3xl p-6 border shadow-[0_30px_80px_rgba(16,24,39,.35)] bg-[var(--card)]";
const cardWrap  = "relative rounded-3xl p-[1px] bg-gradient-to-br from-rose-100/40 via-transparent to-rose-100/40 dark:from-white/5 dark:to-white/5";
const glassBtn  = "ripple px-4 py-2 rounded-lg border bg-white/70 hover:bg-white text-gray-800 backdrop-blur transition shadow-sm hover:shadow hover:-translate-y-[1px] dark:bg-white/10 dark:border-white/10 dark:text-[var(--fg)]";
const solidBtn  = "ripple px-5 py-2 rounded-lg bg-teal-600 text-white shadow-md hover:brightness-[.98] hover:-translate-y-[1px] transition";

/* ---------- Ripple CSS ---------- */
(function injectRippleCSS(){
  if (document.getElementById('ripple-style')) return;
  const style = document.createElement('style');
  style.id = 'ripple-style';
  style.textContent = `
    .ripple{position:relative;overflow:hidden}
    .ripple:after{content:"";position:absolute;inset:0;border-radius:inherit;transform:scale(0);background:rgba(0,0,0,.08);opacity:0;pointer-events:none;transition:transform .35s ease,opacity .45s ease}
    .ripple:active:after{transform:scale(1.15);opacity:1}
    @media(hover:none){.ripple:active{transform:scale(.98)}}
  `;
  document.head.appendChild(style);
})();

/* ---------- Header ---------- */
const Header = ({page,onHome,onHistory,onAnalytics}) => (
  <header className="sticky top-0 z-10 border-b bg-[var(--bg)]/90 backdrop-blur">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 className="text-base md:text-lg font-semibold">
        <span className="font-extrabold">EconoLearn</span>
        <span className="text-gray-500 dark:text-[var(--muted)]"> — CUET PG Economics</span>
      </h1>
      <div className="flex gap-2 text-sm">
        {page==='home' && <>
          <button className={glassBtn} onClick={onHistory}>Review Past Results</button>
          <button className={glassBtn} onClick={onAnalytics}>Analytics</button>
        </>}
        {page!=='home' && <button className={glassBtn} onClick={onHome}>Home</button>}
      </div>
    </div>
  </header>
);

/* ---------- Hero ---------- */
const Hero = () => (
  <div className="text-center my-6">
    <div className="text-3xl md:text-4xl font-extrabold text-rose-400">EconoLearn</div>
    <div className="mt-3 inline-block w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]
                    bg-[url('./ganesh.png')] bg-contain bg-no-repeat bg-center opacity-80"></div>
  </div>
);

/* ---------- QuoteCard (beautiful & theme-aware) ---------- */
const QUOTES = [
  { text: "Growth without equity does not endure.", author: "Amartya Sen", tag:"paraphrase" },
  { text: "Incentives matter — often more than we think.", author: "Paul Krugman" },
  { text: "Good policy is good economics made practical.", author: "Abhijit Banerjee", tag:"paraphrase" },
];
const QuoteCard = () => {
  const q = useMemo(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)],[]);
  return (
    <section className="max-w-5xl mx-auto px-4">
      <div className="rounded-2xl px-6 py-5 bg-[var(--card)] border shadow-[0_20px_60px_rgba(0,0,0,.15)]">
        <div className="flex items-start gap-3">
          <div className="text-4xl md:text-5xl leading-none text-rose-400 font-serif select-none">“</div>
          <div className="flex-1">
            <p className="font-serif text-xl md:text-[1.35rem] leading-relaxed">
              {q.text}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)] italic">
              — {q.author}{q.tag? ` (${q.tag})` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 dark:bg-white/5 dark:text-rose-200 dark:border-white/10">Crafted with 💗 for exam excellence</span>
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 dark:bg-white/5 dark:text-teal-200 dark:border-white/10">Built by Shailesh Kumar + GPT-5</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Theme Dock (floating) ---------- */
const ThemeDock = ({theme,setTheme}) => (
  <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2 p-2 rounded-2xl bg-[var(--card)]/90 backdrop-blur border shadow-xl">
    {['light','dark','deep','system'].map(mode=>(
      <button key={mode}
        className={`px-3 py-1 rounded-full text-sm border transition ${theme===mode
          ? 'bg-teal-600 text-white border-teal-600 shadow'
          : 'bg-transparent border-white/20 text-[var(--fg)] hover:bg-white/10'
        }`}
        onClick={()=>setTheme(mode)}
      >
        {mode[0].toUpperCase()+mode.slice(1)}
      </button>
    ))}
  </div>
);

/* ================================ APP ================================== */
const App = () => {
  const [theme,setTheme] = useTheme();

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

  /* Load questions with normal fetch (SW gives SWR speed) */
  useEffect(()=>{
    fetch('questions.json',{cache:'no-cache'})
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
    timer.current=setInterval(()=>setRemaining(p=>{if(p<=1){clearInterval(timer.current); setPage('result'); return 0;} return p-1;}),1000);
  };

  const resetRun=()=>{ setCurrent(0); setAnswers({}); setMarked({}); setSkipped({}); };
  const startPractice=()=>{ const s = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    setActiveSet(s); resetRun(); stopTimer(); setPage('quiz'); };
  const startTest=()=>{ const pool = chapter==='All'?questions:questions.filter(q=>q.chapter===chapter);
    const req = Math.max(1, parseInt(testCount||1,10)); const n = Math.max(1, Math.min(req, pool.length));
    const s = pickN(pool,n); setActiveSet(s); resetRun(); startTimer(timeForN(n)); setPage('quiz'); };

  useEffect(()=>{ if(page!=='result'||!total) return;
    const entry={ id:'attempt_'+Date.now(), timestamp:new Date().toISOString(),
      mode, chapter, total, score, percent: total?Math.round(score/total*100):0,
      durationSec: mode==='test'?timeForN(total):null,
      answers: Array.from({length:total},(_,i)=>answers[i]??null),
      questions: activeSet.map(q=>({chapter:q.chapter, question:q.question, options:q.options, answer:q.answer, source:q.source??null}))
    }; const h=store.get(); h.unshift(entry); store.set(h.slice(0,50));
  },[page,total,score,answers,activeSet,mode,chapter]);

  /* Loading / error */
  if(loading) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-20 text-center text-[var(--muted)]">Loading…</main><ThemeDock theme={theme} setTheme={setTheme}/></>);
  if(err) return (<><Header page={page}/><main className="max-w-6xl mx-auto px-4 py-20 text-center text-red-500">{err}</main><ThemeDock theme={theme} setTheme={setTheme}/></>);

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
        />
        <Hero />
        <main className="max-w-5xl mx-auto px-4 pb-14">
          <section className={cardWrap}>
            <div className={glassCard}>
              <h2 className="text-2xl md:text-3xl font-extrabold">MCQ Practice for CUET PG Economics</h2>
              <p className="text-[var(--muted)] mt-2">Practice chapter-wise Economics PYQs with instant feedback.</p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Chapter Filter</label>
                  <select value={chapter} onChange={e=>setChapter(e.target.value)}
                          className="ripple w-full p-2 pr-9 border rounded-lg bg-white/70 dark:bg-white/5">
                    {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                            className="ripple w-32 p-2 border rounded-lg bg-white/70 dark:bg-white/5"/>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        Available: {filteredCount}{req>filteredCount && <span className="ml-2 text-rose-500">(Requested {req}, using {effectiveN})</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm block">Time limit</label>
                      <div className="p-2 border rounded bg-white/70 dark:bg-white/5 text-sm w-32 text-center">{fmt(est)}</div>
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
            </div>
          </section>

          <div className="mt-8"><QuoteCard/></div>
        </main>
        <ThemeDock theme={theme} setTheme={setTheme}/>
      </>
    );
  }

  /* ===== The rest (Quiz/Result/History/Analytics) are unchanged from your working version ===== */
  /* For brevity, keep your existing quiz/result/history/analytics sections here. */
  return null;
};

/* Mount */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
