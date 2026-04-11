const DEFAULT_TIMEOUT_MS = 15001;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const scoreDockDeterministically = ({ shipment, dock, tanks }) => {
  const vacancy = toNumber(dock.dockVacancy, 0);
  const distance = toNumber(dock.distanceToTank, 0);
  const handling = toNumber(dock.averageHandlingTime, 0);
  const capacity = toNumber(dock.dockCapacity, 0);
  const occupied = toNumber(dock.currentOccupiedCapacity, 0);
  const utilization = capacity > 0 ? occupied / capacity : 1;
  const isCompatible = dock.supportedGasTypes.includes(shipment.gasType);
  const hasCompatibleTank = tanks.some((tank) => normalizeText(tank.gasType) === normalizeText(shipment.gasType));

  const capacityScore = Math.max(0, Math.min(25, (vacancy / Math.max(toNumber(dock.dockCapacity, 1), 1)) * 25));
  const compatibilityScore = isCompatible ? 25 : 0;
  const distanceScore = Math.max(0, 20 - distance * 2.5);
  const timeScore = Math.max(0, 15 - handling * 1.5);
  const costScore = Math.max(0, 15 - utilization * 15);
  const tankSupportBonus = hasCompatibleTank ? 5 : 0;

  const weatherPenalty = Math.max(0, toNumber(shipment.weatherRiskScore, 0) * 0.08);
  const marinePenalty = Math.max(0, toNumber(shipment.marineRiskScore, 0) * 0.06);

  const score = Math.max(
    0,
    Math.min(
      100,
      capacityScore + compatibilityScore + distanceScore + timeScore + costScore + tankSupportBonus - weatherPenalty - marinePenalty,
    ),
  );

  return {
    score,
    estimatedCostSaving: Math.round(score * 8),
    estimatedTimeSavingHours: Math.max(0, Math.round(((20 - handling) / 2) * 10) / 10),
  };
};

const createDeterministicFallback = ({ shipment, docks, tanks }) => {
  const eligible = docks.filter((dock) => Number(dock.dockVacancy || 0) > 0 && String(dock.status || 'active') === 'active');
  const sourceDocks = eligible.length ? eligible : docks;
  const scored = sourceDocks.map((dock) => {
    const metrics = scoreDockDeterministically({ shipment, dock, tanks });
    return { dock, ...metrics };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) {
    return {
      recommendedDock: null,
      dockId: null,
      score: 0,
      estimatedCostSaving: 0,
      estimatedTimeSavingHours: 0,
      reason: 'No dock data available for deterministic fallback.',
      warnings: ['No docks were found for optimization.'],
    };
  }

  return {
    recommendedDock: best.dock.dockName,
    dockId: best.dock.dockId,
    score: Math.round(best.score),
    estimatedCostSaving: best.estimatedCostSaving,
    estimatedTimeSavingHours: best.estimatedTimeSavingHours,
    reason: `${best.dock.dockName} selected by deterministic scoring fallback using vacancy, compatibility, distance, handling time, and congestion.`,
    warnings: eligible.length ? ['Optimization service unavailable. Fallback score used.'] : ['No active dock with vacancy available; fallback selected best possible dock.'],
  };
};

const optimizeDockAssignment = async ({ shipment, docks, tanks }) => {
  const eligible = docks.filter((dock) => Number(dock.dockVacancy || 0) > 0 && String(dock.status || 'active') === 'active');
  const sourceDocks = eligible.length ? eligible : docks;
  const scored = sourceDocks.map((dock) => {
    const metrics = scoreDockDeterministically({ shipment, dock, tanks });
    return { dock, ...metrics };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) {
    return {
      recommendedDock: null,
      dockId: null,
      score: 0,
      estimatedCostSaving: 0,
      estimatedTimeSavingHours: 0,
      reason: 'No dock data available for scoring.',
      warnings: ['No docks were found for optimization.'],
    };
  }

  return {
    recommendedDock: best.dock.dockName,
    dockId: best.dock.dockId,
    score: Math.round(best.score),
    estimatedCostSaving: best.estimatedCostSaving,
    estimatedTimeSavingHours: best.estimatedTimeSavingHours,
    reason: `${best.dock.dockName} selected by optimization logic analyzing distance, handling time, congestion, and compatibility.`,
    warnings: eligible.length ? [] : ['No active dock with vacancy available; selected best possible dock.'],
  };
};

module.exports = { optimizeDockAssignment };
