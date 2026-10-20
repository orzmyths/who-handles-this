const base = import.meta.env.BASE_URL;
export default function ProductFlow() {
 return (
  <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
   <div className="absolute left-[5vw] top-[5vh] flex items-center gap-[1vw]"><div className="w-[2.5vw] h-[0.5vh] bg-accent"/><p className="text-[1.5vw] font-bold tracking-[0.06em]">WHAT WE BUILT · INNOVATION · WEEKS 4–6</p></div>
   <h1 className="absolute left-[5vw] top-[13vh] w-[88vw] font-display text-[4.1vw] leading-[1.03] font-semibold tracking-tight">Everyday words in. A grounded next step out.</h1>
   <div className="absolute left-[5vw] top-[27vh] w-[43vw] h-[36vh] bg-paper border border-primary/25 rounded-[0.7vw] overflow-hidden">
    <img src={base + 'app-input-detail.png'} crossOrigin="anonymous" alt="Cropped main-app form showing a synthetic German report before submission." className="w-full h-full object-contain"/>
   </div>
   <div className="absolute left-[52vw] top-[27vh] w-[43vw] h-[36vh] bg-paper border border-primary/25 rounded-[0.7vw] overflow-hidden">
    <img src={base + 'app-result-detail.png'} crossOrigin="anonymous" alt="Cropped main-app result showing the California DMV match, service boundary and official source link." className="w-full h-full object-contain"/>
   </div>
   <p className="absolute left-[5vw] top-[64vh] w-[43vw] text-[2vw] font-bold text-primary">1 · Describe the issue in your own words</p>
   <p className="absolute left-[52vw] top-[64vh] w-[43vw] text-[2vw] font-bold text-primary">2 · Get a checked agency handoff</p>
   <div className="absolute left-[5vw] top-[73vh] w-[90vw] flex flex-col gap-[2vh] text-[2vw] leading-[1.18]">
    <p><strong className="font-bold text-primary">Labs AI capability:</strong> structured data extraction—issue, requested action, supporting quote and uncertainty.</p>
    <p><strong className="font-bold text-primary">For City staff:</strong> turns a resident’s words into a checked agency handoff—not an official case submission.</p>
   </div>
   <a href="https://who-handles-this.replit.app" target="_blank" rel="noopener noreferrer" className="absolute left-[5vw] bottom-[3.5vh] text-[1.5vw] text-primary underline underline-offset-[0.3vh]">Replit app: https://who-handles-this.replit.app</a>
   <p className="absolute right-[5vw] bottom-[3.5vh] text-[1.5vw] text-muted">02 / 05</p>
  </div>
 );
}
