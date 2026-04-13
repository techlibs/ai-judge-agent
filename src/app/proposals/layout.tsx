export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">{children}</div>
  );
}
