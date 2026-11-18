export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg ${className}`}>
      <img
        src="/logo.png"
        alt="StrataForge Logo"
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]"
        onError={(e) => {
          // If image fails, fallback to pure vector
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
