import CampusNavbar from "@/app/components/CampusNavbar";

export default function CampusReportsPage() {
  return (
    <>
      <CampusNavbar />
      <main className="pt-28">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-semibold text-slate-900">
            Campus Reports
          </h1>
          <p className="mt-2 text-slate-600">
            View campus reports and analytics here.
          </p>
        </div>
      </main>
    </>
  );
}
