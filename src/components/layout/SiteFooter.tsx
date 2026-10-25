export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium text-foreground">
          Educational prototype. Not financial advice. No data is stored.
        </p>
        <p>Sprout is a hackathon prototype, not affiliated with any bank.</p>
      </div>
    </footer>
  );
}
