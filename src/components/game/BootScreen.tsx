export function BootScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-bg px-6 py-8 text-fg sm:px-12">
      <p className="font-display text-sm tracking-widest text-muted uppercase">Ashline Bureau</p>
      <div>
        <h1 className="font-display text-5xl text-fg sm:text-6xl">Greyhollow</h1>
        <p className="mt-4 max-w-md text-base text-muted">{label}</p>
        <div className="mt-6 h-1 w-40 bg-line">
          <div className="h-full w-2/3 bg-primary" />
        </div>
      </div>
      <p className="text-sm text-muted">Field report 04 — parish outbreak</p>
    </main>
  );
}
