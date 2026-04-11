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

const AnalystDashboardHome = () => {
  const { profile } = useOutletContext() || {};
  const portName = profile?.portName || '';

  const totalBerth = stableIntFromString(portName, 3, 9);
  const totalBerthCapacity = stableIntFromString(portName + '|cap', 2000, 4500);
  const demandEntries = stableIntFromString(portName + '|entries', 120, 950);
  const forecastCoverage = stableIntFromString(portName + '|forecast', 7, 30);
  const pendingApprovals = stableIntFromString(portName + '|pending', 1, 15);
  const berthLocations = ['GCB', 'NCT', 'CCT', 'JETTY-1', 'JETTY-2'];
  const berthData = berthLocations.map((name) => ({
    name,
    capacity: stableIntFromString(`${portName}|${name}`, 800, 2400),
  }));

  return (
    <div className="relative min-h-screen">
      <ImageBackground imageSrc={bgImage} />

      <div className="relative z-10 p-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Product Data Dashboard</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Date', value: new Date().toLocaleDateString(), color: '#94a3b8' },
            { label: 'Country', value: profile?.country || '—', color: '#3B82F6' },
            { label: 'Port', value: profile?.portName || '—', color: '#10B981' },
            { label: 'Total berth', value: totalBerth, color: '#F59E0B' },
            { label: 'Berth capacity', value: totalBerthCapacity, color: '#EF4444' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-4 backdrop-blur-sm transition-transform hover:scale-[1.02]"
            >
              <p className="text-xs font-medium uppercase text-slate-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: 'Demand entries', value: demandEntries, color: '#22c55e' },
            { label: 'Forecast horizon', value: `${forecastCoverage} days`, color: '#06b6d4' },
            { label: 'Pending approvals', value: pendingApprovals, color: '#f97316' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm"
            >
              <p className="text-xs font-medium uppercase text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Berth locations</h2>
    
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700/80 text-slate-400">
                  <th className="py-2 pr-4">Berth location</th>
                  <th className="py-2">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {berthData.map((row) => (
                  <tr key={row.name} className="border-b border-slate-800/70">
                    <td className="py-3 pr-4">{row.name}</td>
                    <td className="py-3">{row.capacity.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/dashboard/demand/entry"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">Demand data entry</p>
            <p className="mt-1 text-sm text-slate-400">
              Enter and manage daily product demand records for forecasting.
            </p>
          </Link>

          <Link
            to="/dashboard/demand/view"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">View data</p>
            <p className="mt-1 text-sm text-slate-400">
              Review submitted demand data, filter records, and generate reports.
            </p>
          </Link>

          <Link
            to="/dashboard/forecast"
            className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition hover:bg-slate-900/80 hover:scale-[1.01]"
          >
            <p className="font-semibold text-white">AI forecasting</p>
            <p className="mt-1 text-sm text-slate-400">
              Generate 7–30 day demand forecasts using historical product data.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AnalystDashboardHome;