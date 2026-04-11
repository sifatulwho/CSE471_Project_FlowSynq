const mongoose = require('mongoose');
require('dotenv').config();
const Tank = require('./models/Tank');

const dummyTanks = [
  { tankId: 'NKU-01', location: 'Dhaka', commodity: 'Water', capacity: 10000, currentLevel: 2500 },
  { tankId: 'NKU-02', location: 'Chittagong', commodity: 'Oil', capacity: 5001, currentLevel: 4500 },
  { tankId: 'NKU-03', location: 'Sylhet', commodity: 'Diesel', capacity: 8000, currentLevel: 7500 },
  { tankId: 'NKU-04', location: 'Khulna', commodity: 'Acid', capacity: 2000, currentLevel: 100 },
  { tankId: 'NKU-05', location: 'Rajshahi', commodity: 'Water', capacity: 15001, currentLevel: 7500 },
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Clearing existing data...');
    await Tank.deleteMany({});
    console.log('Inserting dummy data...');
    await Tank.insertMany(dummyTanks);
    console.log('Seed successful!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
