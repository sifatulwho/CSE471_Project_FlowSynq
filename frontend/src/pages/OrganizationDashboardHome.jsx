import { Link, useOutletContext } from 'react-router-dom';
import ImageBackground from '../components/ImageBackground';
import bgImage from '../assets/bg-image.jpg';

function stableIntFromString(s, min, max) {
  const str = String(s || '');
  let h = 2166136261;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const span = max - min + 1;
  return min + (Math.abs(h) % span);
}

const OrganizationDashboardHome = () => {
  const { profile } = useOutletContext() || {};
  const portName = profile?.portName || '';

  const approvedReports = stableIntFromString(portName + '|reports', 25, 180);
  const pendingRecommendations = stableIntFromString(portName + '|rec', 2, 18);
  const monthlyImports = stableIntFromString(portName + '|imports', 1500, 9000);

  return (
    <div className="relative min-h-screen">
      <ImageBackground imageSrc={bgImage} />

      <div className="relative z-10 p-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
            Organization Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Import Decision Workspace
          </h1>
          <p className="mt-1 text-sm font-medium text-white/80">
            Review approved data, planning insights, and forwarded recommendations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[
            {
              label: 'Date',
              value: new Date().toLocaleDateString(),
              color: '#94a3b8',
            },
            {
              label: 'Country',
              value: profile?.country || '—',
              color: '#3B82F6',
            },
            {
              label: 'Port',
              value: profile?.portName || '—',
              color: '#10B981',
            },
            {
              label: 'Role',
              value: profile?.role || '—',
              color: '#F59E0B',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-4 backdrop-blur-sm transition-transform hover:scale-[1.02]"
            >
              <p className="text-xs uppercase text-slate-400 font-medium">
                {item.label}
              </p>
              <p
                className="mt-2 text-2xl font-bold"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              label: 'Approved reports',
              value: approvedReports,
              color: '#22c55e',
            },
            {
              label: 'Pending recommendations',
              value: pendingRecommendations,
              color: '#f97316',
            },
            {
              label: 'Monthly imports',
              value: monthlyImports,
              color: '#06b6d4',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm"
            >
              <p className="text-xs uppercase text-slate-400 font-medium">
                {card.label}
              </p>
              <p
                className="mt-3 text-3xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/dashboard/demand/view"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">View Approved Data</p>
            <p className="mt-1 text-sm text-slate-400">
              Review approved historical demand and supply records.
            </p>
          </Link>

          <Link
            to="/dashboard/recommendations"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">Recommendations</p>
            <p className="mt-1 text-sm text-slate-400">
              Evaluate forwarded planning and import decisions.
            </p>
          </Link>

          <Link
            to="/dashboard/forecast"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">Forecast Insights</p>
            <p className="mt-1 text-sm text-slate-400">
              View projected future demand for planning imports.
            </p>
          </Link>
        </div> */}
      </div>
    </div>
  );
};

export default OrganizationDashboardHome;

