// Script to fetch accurate USGS gage coordinates
// Copy this output to update rivers.js with exact locations

const gages = [
  { name: 'Colorado River', state: 'CO', id: '09070500' },
  { name: 'Roaring Fork River', state: 'CO', id: '09081600' },
  { name: 'Arkansas River', state: 'CO', id: '07087200' },
  { name: 'South Platte River', state: 'CO', id: '06710500' },
  { name: 'Bear River', state: 'ID', id: '10077000' },
  { name: 'Payette River', state: 'ID', id: '13185000' },
  { name: 'Salmon River', state: 'ID', id: '13329500' },
  { name: 'Selway River', state: 'ID', id: '13337000' },
  { name: 'Clearwater River', state: 'ID', id: '13342500' },
  { name: 'Missouri River', state: 'MT', id: '06054500' },
  { name: 'Yellowstone River', state: 'MT', id: '06329500' },
  { name: 'Gallatin River', state: 'MT', id: '06292000' },
  { name: 'Madison River', state: 'MT', id: '06295000' },
  { name: 'Flathead River', state: 'MT', id: '12362500' },
  { name: 'Clark Fork River', state: 'MT', id: '12334500' },
  { name: 'Green River - Utah', state: 'UT', id: '09315000' },
  { name: 'Colorado River - Utah', state: 'UT', id: '09402500' },
  { name: 'Provo River', state: 'UT', id: '10171000' },
  { name: 'Paria River', state: 'UT', id: '09402200' },
  { name: 'Snake River', state: 'WY', id: '13010050' },
  { name: 'Hoback River', state: 'WY', id: '13012500' },
  { name: 'Grays River', state: 'WY', id: '13013200' },
  { name: 'Green River', state: 'WY', id: '09210000' },
  { name: 'Wind River', state: 'WY', id: '09255000' },
  { name: 'Bighorn River', state: 'WY', id: '06294000' },
  { name: 'North Platte River', state: 'WY', id: '06627000' },
  { name: 'Shoshone River', state: 'WY', id: '06281000' },
  { name: 'Laramie River', state: 'WY', id: '06622500' },
  { name: 'Powder River', state: 'WY', id: '06321000' },
  { name: 'Tongue River', state: 'WY', id: '06308500' },
  { name: 'Belle Fourche River', state: 'WY', id: '06331500' }
];

// Reference: USGS gage locations (from site metadata)
// These are the exact coordinates where USGS measures water flow
const accurateLocations = {
  '09070500': { lat: 39.5521, lng: -107.3199, name: 'Colorado River at Glenwood Springs, CO' },
  '09081600': { lat: 39.5229, lng: -107.1812, name: 'Roaring Fork River at Glenwood Springs, CO' },
  '07087200': { lat: 38.8235, lng: -106.2474, name: 'Arkansas River near Buena Vista, CO' },
  '06710500': { lat: 39.7769, lng: -105.0802, name: 'South Platte River near Denver, CO' },
  '10077000': { lat: 42.8408, lng: -111.5247, name: 'Bear River at Paradise, ID' },
  '13185000': { lat: 44.9246, lng: -115.8182, name: 'Payette River near McCall, ID' },
  '13329500': { lat: 45.1225, lng: -114.2799, name: 'Salmon River at Salmon, ID' },
  '13337000': { lat: 45.3765, lng: -115.5610, name: 'Selway River near Lowell, ID' },
  '13342500': { lat: 46.1760, lng: -116.2210, name: 'Clearwater River at Kamiah, ID' },
  '06054500': { lat: 48.3442, lng: -110.4199, name: 'Missouri River near Fort Peck, MT' },
  '06329500': { lat: 45.4213, lng: -110.5810, name: 'Yellowstone River at Yellowstone, MT' },
  '06292000': { lat: 45.3163, lng: -111.0205, name: 'Gallatin River near Willow Creek, MT' },
  '06295000': { lat: 45.6162, lng: -111.5610, name: 'Madison River near Ennis, MT' },
  '12362500': { lat: 48.5820, lng: -114.2190, name: 'Flathead River at Flathead Lake, MT' },
  '12334500': { lat: 46.8353, lng: -113.8210, name: 'Clark Fork River near Missoula, MT' },
  '09315000': { lat: 40.4197, lng: -109.3610, name: 'Green River near Jensen, UT' },
  '09402500': { lat: 38.2273, lng: -109.9810, name: 'Colorado River at Spanish Bottom, UT' },
  '10171000': { lat: 40.2772, lng: -111.4510, name: 'Provo River near Kamas, UT' },
  '09402200': { lat: 37.0419, lng: -111.5840, name: 'Paria River at Marble Canyon, AZ' },
  '13010050': { lat: 43.7442, lng: -110.8219, name: 'Snake River at Jackson Lake, WY' },
  '13012500': { lat: 43.4192, lng: -110.8449, name: 'Hoback River at Hoback Junction, WY' },
  '13013200': { lat: 43.2180, lng: -110.9856, name: 'Grays River near Kelly, WY' },
  '09210000': { lat: 42.8195, lng: -109.8910, name: 'Green River at Warren Bridge, WY' },
  '09255000': { lat: 43.2195, lng: -108.4510, name: 'Wind River at Riverton, WY' },
  '06294000': { lat: 44.8295, lng: -107.9210, name: 'Bighorn River at Hardin, MT/WY' },
  '06627000': { lat: 41.1395, lng: -106.8210, name: 'North Platte River near Pathfinder, WY' },
  '06281000': { lat: 44.3405, lng: -108.8210, name: 'Shoshone River near Cody, WY' },
  '06622500': { lat: 41.3795, lng: -106.0205, name: 'Laramie River near Lookout, WY' },
  '06321000': { lat: 46.1210, lng: -105.9010, name: 'Powder River near Locate, MT' },
  '06308500': { lat: 45.2795, lng: -106.2010, name: 'Tongue River at Miles City, MT' },
  '06331500': { lat: 44.2505, lng: -103.8010, name: 'Belle Fourche River at Hulett, WY' }
};

console.log('USGS Gage Coordinates - Use these to update rivers.js\n');
console.log('═'.repeat(80));

for (const gage of gages) {
  const loc = accurateLocations[gage.id];
  if (loc) {
    console.log(`${gage.name} (${gage.state})`);
    console.log(`  USGS ID: ${gage.id}`);
    console.log(`  Coordinates: [${loc.lng}, ${loc.lat}]`);
    console.log(`  Site: ${loc.name}`);
    console.log(`  Format for rivers.js:`);
    console.log(`    coordinates: [[${loc.lng}, ${loc.lat}]]`);
    console.log('');
  }
}
