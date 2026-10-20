export default function TraceFinding() {
 return (
  <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
   <div className="absolute left-[5vw] top-[5vh] flex items-center gap-[1vw]"><div className="w-[2.5vw] h-[0.5vh] bg-accent"/><p className="text-[1.5vw] font-bold tracking-[0.06em]">WHERE IT BREAKS · RESPONSIBLE AI · WEEK 7</p></div>
   <h1 className="absolute left-[5vw] top-[13vh] w-[88vw] font-display text-[4.3vw] leading-[1.03] font-semibold tracking-tight">A language gap briefly became an extra step.</h1>
   <div className="absolute left-[5vw] top-[31vh] w-[41vw] text-[2vw] leading-[1.25]">
    <p><strong className="font-bold text-primary">Synthetic TRACE input:</strong> “Mein Führerschein ist abgelaufen.”</p>
    <div className="mt-[5vh] bg-accent/10 border border-accent/35 p-[2vw] rounded-[0.6vw]">
     <p><strong className="font-bold">First-run wrong output:</strong> “Möchten Sie Ihren Führerschein erneuern oder ersetzen?”</p>
    </div>
   </div>
   <div className="absolute left-[52vw] top-[31vh] w-[43vw] flex flex-col gap-[4vh] text-[2vw] leading-[1.25]">
    <p><strong className="font-bold text-accent">Production harm:</strong> a German-speaking resident must answer an avoidable extra question before receiving the DMV renewal handoff. No resident harm was measured.</p>
    <p><strong className="font-bold text-primary">Change and retest:</strong> tightened multilingual service/action guidance and evidence-quote checks. The later regression routed to California DMV · Driver license / Renew.</p>
   </div>
   <p className="absolute left-[5vw] top-[86vh] w-[87vw] border-t border-primary/25 pt-[2vh] text-[1.5vw] leading-[1.3] text-muted">Retest: 7/7 language variants met developer expectations. Development corpus—not independent accuracy validation.</p>
   <p className="absolute right-[5vw] bottom-[3.5vh] text-[1.5vw] text-muted">03 / 05</p>
  </div>
 );
}
