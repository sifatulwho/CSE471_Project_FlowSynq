// const mongoose = require('mongoose');

// const optionalNum = {
//   type: Number,
//   min: 0,
// };

// const demandSchema = new mongoose.Schema({
//   date: { type: Date, required: true },
//   region: { type: String, required: true, trim: true },
//   portName: { type: String, trim: true, index: true, default: '' },
//   commodity_type: { type: String, trim: true, default: '' },
//   demand_quantity: optionalNum,
//   vessel_count: optionalNum,
//   working_vessels: optionalNum,
//   waiting_vessels: optionalNum,
//   containers_handled: optionalNum,
//   empty_containers: optionalNum,
//   location: { type: String, trim: true, default: '' },
//   // Backward compatibility for older UI/data; keep until you migrate old rows.
//   location_code: { type: String, trim: true, default: '' },
//   batchId: { type: String, trim: true, index: true, default: '' },
//   batchNote: { type: String, trim: true, default: '' },
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending',
//     index: true,
//   },
//   submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
//   reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   reviewedAt: { type: Date },
//   rejectionReason: { type: String, trim: true, default: '' },
// }, {
//   timestamps: true,
// });

// module.exports = mongoose.model('Demand', demandSchema);

const mongoose = require('mongoose');

const optionalNum = {
  type: Number,
  min: 0,
  default: 0,
};

const demandSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  region: { type: String, required: true, trim: true },
  portName: { type: String, required: true, trim: true, index: true },

  commodity_type: { type: String, required: true, trim: true, index: true },
  shipName: { type: String, trim: true, default: '' },

  commodity_quantity: optionalNum,
  container_count: optionalNum,
  container_delivered: optionalNum,
  remaining_commodity_container: optionalNum,

  total_container: optionalNum,
  total_quantity: optionalNum,
  total_handled: optionalNum,
  remaining_container: optionalNum,
  total_delivered: optionalNum,
  total_shipments: optionalNum,
  total_delayed_shipments: optionalNum,

  berth_location: { type: String, trim: true, default: '' },
  berth_capacity: optionalNum,
  berth_vacancy: { type: Number, default: 0 },
  
  vessel_count: optionalNum,
  working_vessels: optionalNum,
  waiting_vessels: optionalNum,
  containers_handled: optionalNum,
  storage_level: optionalNum,
  empty_containers: optionalNum,
  berth_occupancy: optionalNum,
  vacant_berths: optionalNum,
  equipment_usage_index: optionalNum,
  location_code: { type: String, trim: true, default: '' },
  location_count: optionalNum,
  vessel_status: { type: String, trim: true, default: '' },

  batchId: { type: String, trim: true, index: true, default: '' },
  batchNote: { type: String, trim: true, default: '' },

  /** Legacy field kept for older imports; forecasting prefers commodity_quantity. */
  demand_quantity: { type: Number, min: 0 },

  sourceDailyOpsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyPortOps',
    index: true,
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String, trim: true, default: '' },
}, {
  timestamps: true,
});

demandSchema.index({ portName: 1, commodity_type: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Demand', demandSchema);