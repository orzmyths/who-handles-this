export default function UserEvidence() {
 return (
  <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
   <div className="absolute left-[5vw] top-[5vh] flex items-center gap-[1vw]"><div className="w-[2.5vw] h-[0.5vh] bg-accent"/><p className="text-[1.5vw] font-bold tracking-[0.06em]">WHO IT SERVES · USER EVIDENCE</p></div>
   <h1 className="absolute left-[5vw] top-[13vh] w-[88vw] font-display text-[4.15vw] leading-[1.03] font-semibold tracking-tight">Residents are the primary user; staff are the review partner.</h1>
   <div className="absolute left-[5vw] top-[34vh] w-[40vw] flex flex-col gap-[6vh] text-[2.15vw] leading-[1.25]">
    <p><strong className="font-bold text-primary">Residents</strong> need a clear handoff without knowing the agency name.</p>
    <p><strong className="font-bold text-primary">City intake staff</strong> need a structured issue summary, supporting evidence and visible uncertainty before human review.</p>
   </div>
   <div className="absolute left-[49vw] top-[34vh] w-[0.1vw] h-[48vh] bg-primary/25"/>
   <div className="absolute left-[54vw] top-[34vh] w-[41vw] flex flex-col gap-[5vh] text-[2vw] leading-[1.23]">
    <p><strong className="font-bold text-accent">Feedback finding:</strong> no resident or City-staff session notes are documented; both personas remain illustrative.</p>
    <p><strong className="font-bold text-primary">What surprised us / what changed:</strong> no feedback finding or feedback-driven prototype change can be substantiated. The deck makes that evidence gap explicit instead of claiming a user insight.</p>
   </div>
   <div className="absolute left-[5vw] bottom-[11vh] w-[90vw] h-[0.4vh] bg-accent/65"/>
   <p className="absolute left-[5vw] bottom-[4vh] text-[1.5vw] text-muted">Who Handles This? · City of San José</p><p className="absolute right-[5vw] bottom-[4vh] text-[1.5vw] text-muted">05 / 05</p>
  </div>
 );
}
