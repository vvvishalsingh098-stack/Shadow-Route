const path = require('path');

const areas = [
  {
    id: 'connaught-place',
    name: 'Connaught Place, New Delhi (sample)',
    bbox: { south: 28.624, west: 77.210, north: 28.642, east: 77.230 },
    dataPath: path.join(__dirname, 'data', 'pilot_area.json')
  },
  {
    id: 'delhi',
    name: 'Delhi',
    bbox: { south: 28.54, west: 77.12, north: 28.69, east: 77.31 },
    dataPath: path.join(__dirname, 'data', 'areas', 'delhi.json')
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    bbox: { south: 18.91, west: 72.79, north: 19.08, east: 72.98 },
    dataPath: path.join(__dirname, 'data', 'areas', 'mumbai.json')
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    bbox: { south: 12.88, west: 77.48, north: 13.07, east: 77.70 },
    dataPath: path.join(__dirname, 'data', 'areas', 'bengaluru.json')
  },
  {
    id: 'chennai',
    name: 'Chennai',
    bbox: { south: 12.91, west: 80.17, north: 13.10, east: 80.31 },
    dataPath: path.join(__dirname, 'data', 'areas', 'chennai.json')
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    bbox: { south: 17.30, west: 78.33, north: 17.51, east: 78.56 },
    dataPath: path.join(__dirname, 'data', 'areas', 'hyderabad.json')
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    bbox: { south: 22.47, west: 88.27, north: 22.66, east: 88.45 },
    dataPath: path.join(__dirname, 'data', 'areas', 'kolkata.json')
  },
  {
    id: 'pune',
    name: 'Pune',
    bbox: { south: 18.43, west: 73.77, north: 18.63, east: 73.94 },
    dataPath: path.join(__dirname, 'data', 'areas', 'pune.json')
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    bbox: { south: 22.94, west: 72.48, north: 23.13, east: 72.67 },
    dataPath: path.join(__dirname, 'data', 'areas', 'ahmedabad.json')
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    bbox: { south: 26.81, west: 75.70, north: 27.00, east: 75.89 },
    dataPath: path.join(__dirname, 'data', 'areas', 'jaipur.json')
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    bbox: { south: 26.77, west: 80.84, north: 26.96, east: 81.03 },
    dataPath: path.join(__dirname, 'data', 'areas', 'lucknow.json')
  }
];

module.exports = {
  areas,
  defaultAreaId: 'connaught-place',
  indiaBbox: { south: 6.5, west: 68.0, north: 35.7, east: 97.5 },
  bbox: areas[0].bbox,
  w1: 1.5,
  w2: 2.0,
  port: Number(process.env.PORT) || 3000,
  dataPath: areas[0].dataPath
};
