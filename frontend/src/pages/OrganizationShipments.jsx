import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import RouteMap from '../components/RouteMap';
import WeatherRiskPanel from '../components/WeatherRiskPanel';
import DemandSupplyGapCard from '../components/DemandSupplyGapCard';

const API = 'http://localhost:5001/api/shipments';

const OrganizationShipments = () => {
  const { token } = useOutletContext();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
        setShipments(response.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  if (loading) return <div className="text-slate-400">Loading shipments...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Shipment Risk View</h2>
      {shipments.map((shipment) => (
        <div key={shipment._id} className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{shipment.shipName}</h3>
            <span className="text-sm text-slate-400">{shipment.commodityType || 'Other'}</span>
          </div>
          <RouteMap
            startingPort={shipment.startingPort}
            destinationPort={shipment.destinationPort}
            waypoints={shipment.routeData?.waypoints || []}
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <WeatherRiskPanel shipment={shipment} />
            <DemandSupplyGapCard impact={shipment.demandSupplyImpact} commodityType={shipment.commodityType} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrganizationShipments;
