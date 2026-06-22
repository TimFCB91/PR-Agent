export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">PR-Agent</h1>
          <p className="mt-1 text-sm text-gray-500">
            SaaS für PR-Agenturen & Kommunikationsteams
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
