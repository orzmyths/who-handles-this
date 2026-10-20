export default function PrivacyGate() {
 return (
  <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
   <div className="absolute left-[5vw] top-[5vh] flex items-center gap-[1vw]"><div className="w-[2.5vw] h-[0.5vh] bg-accent"/><p className="text-[1.5vw] font-bold tracking-[0.06em]">WHAT GOVERNANCE THIS REQUIRES · RESPONSIBLE AI · WEEK 7</p></div>
   <h1 className="absolute left-[5vw] top-[13vh] w-[88vw] font-display text-[4.3vw] leading-[1.03] font-semibold tracking-tight">A prototype safeguard is not City privacy approval.</h1>
   <div className="absolute left-[5vw] top-[33vh] w-[42vw]">
    <p className="text-[2vw] leading-[1.25]"><strong className="font-bold text-primary">Unmet governance gap:</strong> no City-approved data-protection and retention plan for real resident free text.</p>
    <p className="mt-[6vh] font-display text-[3vw] leading-[1.12] text-primary">No live resident pilot before privacy/security sign-off.</p>
   </div>
   <div className="absolute left-[53vw] top-[33vh] w-[42vw] bg-primary/10 border border-primary/25 p-[2vw] rounded-[0.8vw] flex flex-col gap-[3vh] text-[2vw] leading-[1.2]">
    <p className="font-bold text-primary">City owners must approve:</p>
    <p><strong>1.</strong> Permitted data, consent notice and AI-provider processing terms.</p>
    <p><strong>2.</strong> Access owners, retention periods and deletion rules.</p>
    <p><strong>3.</strong> Incident response and evidence that the controls work.</p>
   </div>
   <p className="absolute left-[5vw] top-[86vh] w-[87vw] border-t border-accent/40 pt-[2vh] text-[1.5vw] leading-[1.3] text-muted">Prototype safeguards and synthetic tests do not constitute City approval.</p>
   <p className="absolute right-[5vw] bottom-[3.5vh] text-[1.5vw] text-muted">04 / 05</p>
  </div>
 );
}
