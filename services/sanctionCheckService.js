const SanctionedEntry = require('../models/SanctionedEntry');

const normalize = (v) => String(v || '').trim();
const toLow = (v) => normalize(v).toLowerCase();

const containsCaseInsensitive = (source, target) => {
  const a = toLow(source);
  const b = toLow(target);
  return a.includes(b) || b.includes(a);
};

const checkShipmentSanctions = async ({ organizationName, commodityType, vesselName, vesselImoNumber }) => {
  const activeEntries = await SanctionedEntry.find({ status: 'active' }).lean();
  const reasons = [];
  const matchedEntities = [];

  for (const entry of activeEntries) {
    if (entry.entryType === 'organization' && containsCaseInsensitive(organizationName, entry.name)) {
      reasons.push('Organization is sanctioned');
      matchedEntities.push(`Organization: ${entry.name}`);
    }
    if (entry.entryType === 'commodity' && containsCaseInsensitive(commodityType, entry.name)) {
      reasons.push('Commodity is banned');
      matchedEntities.push(`Commodity: ${entry.name}`);
    }
    if (entry.entryType === 'vessel') {
      const vesselMatch = containsCaseInsensitive(vesselName, entry.name);
      const imoMatch = entry.identifier && vesselImoNumber && containsCaseInsensitive(vesselImoNumber, entry.identifier);
      if (vesselMatch || imoMatch) {
        reasons.push('Vessel is sanctioned');
        matchedEntities.push(`Vessel: ${entry.name}${entry.identifier ? ` (${entry.identifier})` : ''}`);
      }
    }
  }

  return {
    isSanctioned: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
    matchedEntities: Array.from(new Set(matchedEntities)),
  };
};

module.exports = { checkShipmentSanctions };
