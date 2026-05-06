"use client";

export function SuccessModal({ 
  title = "Success!", 
  message, 
  onClose 
}: { 
  title?: string;
  message: string; 
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-[2.5rem] border border-hairline bg-elevated p-10 shadow-2xl animate-fade-up">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display text-2xl font-extreme tracking-tight text-ink">{title}</h3>
          <p className="mt-3 text-base font-medium text-subtext leading-relaxed">
            {message}
          </p>
          <button
            onClick={onClose}
            className="mt-10 w-full rounded-2xl bg-accent px-8 py-4 text-sm font-extreme text-white shadow-lift transition-all hover:bg-accent-hover active:scale-95"
          >
            Great, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
