const ALLOWED_COMMODITIES = [
  'Container',
  'General Cargo',
  'Food Grain',
  'Fertilizer',
  'Clinker',
  'Sugar',
  'Salt',
  'Rapeseed',
  'Mustard Seed',
  'Oil Tanker'
];

const normalizeCommodity = (value) => String(value || '').trim();

module.exports = {
  ALLOWED_COMMODITIES,
  normalizeCommodity,
};
