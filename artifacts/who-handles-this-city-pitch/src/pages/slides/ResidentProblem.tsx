const base = import.meta.env.BASE_URL;
export default function ResidentProblem() {
 return (
  <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
   <div className="absolute left-[5vw] top-[5vh] flex items-center gap-[1vw]"><div className="w-[2.5vw] h-[0.5vh] bg-accent"/><p className="text-[1.5vw] font-bold tracking-[0.06em]">THE PROBLEM · STORY CLARITY · WEEKS 1–3</p></div>
   <h1 className="absolute left-[5vw] top-[13vh] w-[87vw] font-display text-[4.4vw] leading-[1.02] font-semibold tracking-tight">Residents shouldn’t have to know the system to ask for help.</h1>
   <div className="absolute left-[5vw] top-[34vh] w-[53vw] flex flex-col gap-[3vh] text-[2vw] leading-[1.24]">
    <p><strong className="font-bold text-primary">Illustrative persona:</strong> a San José resident reading an unemployment notice and a garbage bill in a language they understand less comfortably.</p>
    <p><strong className="font-bold text-primary">Failure moment:</strong> public directories expect residents to know the department before they know which office owns the next step.</p>
    <p><strong className="font-bold text-primary">Problem:</strong> residents must translate everyday problems into agency language to find the right City, County or State service.</p>
    <p className="text-[1.5vw] text-muted leading-[1.3]">This persona is illustrative—not an observed research participant.</p>
   </div>
   <div className="absolute left-[62vw] top-[34vh] w-[33vw] h-[32vh] bg-sand/50 rounded-[1vw]"/>
   <img src={base + 'resident-notices.png'} crossOrigin="anonymous" alt="Illustrated hands comparing two service notices; no identifiable resident." className="absolute left-[61vw] top-[31vh] w-[35vw] h-[37vh] object-contain"/>
   <div className="absolute left-[62vw] top-[71vh] w-[33vw] flex items-center gap-[2vw] border-t border-primary/30 pt-[2vh]">
    <p className="font-display text-[4vw] leading-none text-primary font-semibold">5/7</p>
    <p className="text-[1.5vw] leading-[1.25]">language variants met developer expectations in the first prototype check.</p>
   </div>
   <p className="absolute left-[62vw] top-[85vh] w-[33vw] text-[1.5vw] leading-[1.25] text-muted">Synthetic checks—not resident research.</p>
   <p className="absolute left-[5vw] bottom-[4vh] text-[1.5vw] text-muted">City of San José · Product introduction</p><p className="absolute right-[5vw] bottom-[4vh] text-[1.5vw] text-muted">01 / 05</p>
  </div>
 );
}
