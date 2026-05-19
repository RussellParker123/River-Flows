// YouTube videos are assigned at the SEGMENT level, not river level
// To add a video to a segment, add youtube_url: 'https://www.youtube.com/embed/VIDEO_ID' to the segment object
// Example:
// segments: [
//   {
//     name: 'Section Name',
//     grade: 'III',
//     youtube_url: 'https://www.youtube.com/embed/VIDEOID123',
//     coordinates: [...]
//   }
// ]
// Note: Use 'placeholder' as the video ID for segments without a video yet

export const rivers = [
  {
    name: 'Snake River - Dead Mans to Moose',
    state: 'WY',
    grade: 'I',
    usgs_gage: '13010050',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary lava flows',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish, sculpin',
    youtube_url: 'https://www.youtube.com/embed/TEaYxoJMMV4',
    description: 'Dead Mans to Moose - Scenic Class I Float with Route Finding. Beautiful float with some tricky navigation due to underwater obstacles. Moderate current, scenic views, requires good boat control and route finding skills.',
    usgs_data: {
      current_flow: null,
      record_high: 36300,
      record_low: 560,
      yearly_average: 9280
    },
    segments: [
      {
        name: 'Dead Mans to Moose',
        grade: 'I',
        youtube_url: 'https://www.youtube.com/embed/TEaYxoJMMV4',
        coordinates: [
          [-110.6272649, 43.7609535],
          [-110.6300, 43.7550],
          [-110.6350, 43.7480],
          [-110.6400, 43.7400],
          [-110.6500, 43.7300],
          [-110.6600, 43.7200],
          [-110.6700, 43.7100],
          [-110.6800, 43.7000],
          [-110.6900, 43.6900],
          [-110.7000, 43.6800],
          [-110.7100, 43.6700],
          [-110.7150194, 43.6548943]
        ]
      }
    ]
  },
  {
    name: 'Snake River - West Table to Sheep Gulch',
    state: 'WY',
    grade: 'III',
    usgs_gage: '13010050',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary lava flows',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish, sculpin',
    youtube_url: 'https://www.youtube.com/embed/aOhMKO6Otas',
    description: 'West Table to Sheep Gulch - Classic Jackson Hole Run. Season: March to November. Class: III (Sections of Class IV at high water). Gauge: Alpine. Length: 8 miles.',
    usgs_data: {
      current_flow: null,
      record_high: 36300,
      record_low: 560,
      yearly_average: 9280
    },
    segments: [
      {
        name: 'Snake River Canyon',
        grade: 'III',
        youtube_url: 'https://www.youtube.com/embed/aOhMKO6Otas',
        coordinates: [
          [-110.821828, 43.2045618],
          [-110.8247595, 43.2025498],
          [-110.8281282, 43.2028811],
          [-110.8312688, 43.2036783],
          [-110.8342869, 43.2032672],
          [-110.8382548, 43.2045359],
          [-110.8406186, 43.2047438],
          [-110.842972, 43.2053411],
          [-110.846495, 43.2053213],
          [-110.8495584, 43.2044043],
          [-110.8519278, 43.2038349],
          [-110.8544979, 43.2035779],
          [-110.8579538, 43.2032876],
          [-110.860784, 43.2024521],
          [-110.8616837, 43.201259],
          [-110.8624258, 43.2000287],
          [-110.8632617, 43.1997256],
          [-110.8662265, 43.1997061],
          [-110.8678958, 43.1987164],
          [-110.8684196, 43.1979512],
          [-110.8696264, 43.1953145],
          [-110.87263, 43.1944188],
          [-110.8770192, 43.1946418],
          [-110.880373, 43.1952387],
          [-110.8828496, 43.1958675],
          [-110.8852668, 43.1950832],
          [-110.8920591, 43.1956658],
          [-110.8982342, 43.1968533],
          [-110.9044479, 43.1975444],
          [-110.9073085, 43.1972591],
          [-110.9093689, 43.1956372],
          [-110.9124997, 43.1942935],
          [-110.9169821, 43.1954323],
          [-110.9197604, 43.1968985],
          [-110.9226994, 43.1965037],
          [-110.9246048, 43.1957218],
          [-110.9256327, 43.1934581],
          [-110.9276824, 43.1915883],
          [-110.9316219, 43.1908323],
          [-110.9359116, 43.1904195],
          [-110.9380565, 43.1905891],
          [-110.9404074, 43.191061],
          [-110.9423339, 43.1901771],
          [-110.9436936, 43.1890274],
          [-110.945766, 43.188186],
          [-110.9480601, 43.1887685],
          [-110.950403, 43.1892392],
          [-110.9526681, 43.1883256],
          [-110.9532425, 43.186615],
          [-110.9541835, 43.1856189],
          [-110.9560367, 43.1848565]
        ]
      }
    ]
  },
  {
    name: 'Snake River - South Park to Astoria Hot Springs',
    state: 'WY',
    grade: 'II',
    usgs_gage: '13010050',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary lava flows',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish, sculpin',
    youtube_url: 'https://www.youtube.com/embed/aOhMKO6Otas',
    description: 'South Park to Astoria Hot Springs - Scenic Intermediate Run. Season: All year. Class: II (very strong currents during high water). Gauge: Snake River @ Moose. Length: 9 miles. Shuttle: 9 miles, easy to find rides during summer.',
    usgs_data: {
      current_flow: null,
      record_high: 36300,
      record_low: 560,
      yearly_average: 9280
    },
    segments: [
      {
        name: 'South Park to Astoria',
        grade: 'II',
        youtube_url: 'https://www.youtube.com/embed/oOht4znUiqk',
        coordinates: [
          [-110.7445676, 43.3855774],
          [-110.7414024, 43.3833511],
          [-110.7415354, 43.3811823],
          [-110.7427256, 43.3792889],
          [-110.7428286, 43.3762553],
          [-110.7422743, 43.3752436],
          [-110.7408451, 43.373903],
          [-110.7342532, 43.3691988],
          [-110.7304822, 43.3669477],
          [-110.7270597, 43.3637115],
          [-110.7251827, 43.3606615],
          [-110.720468, 43.357437],
          [-110.717741, 43.3564265],
          [-110.7152479, 43.3540911],
          [-110.7162654, 43.3518014],
          [-110.7187329, 43.3480991],
          [-110.721441, 43.3444884],
          [-110.7241924, 43.3427882],
          [-110.7256834, 43.3409856],
          [-110.7256503, 43.3381855],
          [-110.7268866, 43.336028],
          [-110.7279343, 43.3342422],
          [-110.7286556, 43.3322654],
          [-110.7296699, 43.3293454],
          [-110.7315801, 43.3240476],
          [-110.7332233, 43.3213334],
          [-110.7357202, 43.3186445],
          [-110.7359147, 43.3147731],
          [-110.7365395, 43.3123659],
          [-110.7377087, 43.3103115],
          [-110.7432379, 43.3095745],
          [-110.7457186, 43.3083768],
          [-110.7476919, 43.3046754],
          [-110.7503842, 43.3027465],
          [-110.7538817, 43.3009291],
          [-110.7605264, 43.3000248],
          [-110.7672669, 43.2994646],
          [-110.7717586, 43.2993692],
          [-110.7766609, 43.3011254]
        ]
      }
    ]
  },
  {
    name: 'Snake River - Jackson Dam to Pacific Creek',
    state: 'WY',
    grade: 'I',
    usgs_gage: '13010050',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary lava flows',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish, sculpin',
    youtube_url: 'https://www.youtube.com/embed/hDDUEmnD8Js',
    description: 'Jackson Dam to Pacific Creek - Scenic Class I Float. Perfect for beginners and families. Gentle current with beautiful views of Jackson Lake and the Teton Range.',
    usgs_data: {
      current_flow: null,
      record_high: 36300,
      record_low: 560,
      yearly_average: 9280
    },
    segments: [
      {
        name: 'Jackson Lake Scenic Float',
        grade: 'I',
        youtube_url: 'https://www.youtube.com/embed/hDDUEmnD8Js',
        coordinates: [
          [-110.5881179, 43.857862],
          [-110.5800, 43.8570],
          [-110.5700, 43.8560],
          [-110.5600, 43.8550],
          [-110.5500, 43.8500],
          [-110.5300, 43.8475],
          [-110.5182376, 43.8458057]
        ]
      }
    ]
  },
  {
    name: 'Granite Creek',
    state: 'WY',
    grade: 'III',
    usgs_gage: '13012400',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite; Paleozoic limestone and sandstone; Mesozoic shale',
    fish_species: 'Brown trout, cutthroat trout',
    youtube_url: 'https://www.youtube.com/embed/7OPVRIim-0g',
    description: 'Granite Falls to Hoback River - Short, Sweet Spring Run. Season: Runoff, May to July. Class: III-. Gauge: None (visual assessment). Length: 4.5 miles. Shuttle: 4.5 miles, easy to bike or run with two cars.',
    usgs_data: {
      current_flow: null,
      record_high: 2500,
      record_low: 80,
      yearly_average: 450
    },
    segments: [
      {
        name: 'Upper Granite Falls',
        grade: 'III',
        youtube_url: 'https://www.youtube.com/embed/7OPVRIim-0g',
        coordinates: [
          [-110.4438938, 43.3650619],
          [-110.4441908, 43.3646347],
          [-110.4442266, 43.3641043],
          [-110.4441435, 43.3633344],
          [-110.4442691, 43.3628887],
          [-110.4441413, 43.3624081],
          [-110.4436543, 43.3618916],
          [-110.4433841, 43.3617447],
          [-110.4433338, 43.3613023],
          [-110.4431604, 43.3603934],
          [-110.4430522, 43.3599692],
          [-110.4429968, 43.3597257],
          [-110.4433114, 43.3593866],
          [-110.4436106, 43.3591466],
          [-110.4437794, 43.3588123],
          [-110.4440425, 43.3584664],
          [-110.444244, 43.358069],
          [-110.4439444, 43.357795],
          [-110.4435063, 43.3576181],
          [-110.4433051, 43.3572253],
          [-110.4429199, 43.3567351],
          [-110.4423337, 43.3559757],
          [-110.4424697, 43.3553657],
          [-110.4421142, 43.3547386],
          [-110.4420466, 43.3539483],
          [-110.4416466, 43.353357],
          [-110.4410922, 43.352907],
          [-110.4410864, 43.3524545],
          [-110.4406035, 43.3517819],
          [-110.4404469, 43.351029],
          [-110.439558, 43.3496808],
          [-110.4390284, 43.3490309],
          [-110.4387973, 43.3484469],
          [-110.438286, 43.3475362],
          [-110.4385155, 43.3464632],
          [-110.4384064, 43.3453114],
          [-110.4385658, 43.3448458],
          [-110.4390189, 43.3446295],
          [-110.4393747, 43.3443506],
          [-110.4392274, 43.3437371],
          [-110.4388605, 43.3429947],
          [-110.4383813, 43.3422038],
          [-110.4382984, 43.3417356],
          [-110.4377806, 43.3412486],
          [-110.4372073, 43.3409767],
          [-110.4371761, 43.3406279],
          [-110.4383639, 43.340364],
          [-110.438899, 43.3395694],
          [-110.4388119, 43.3385273],
          [-110.4392264, 43.3371601],
          [-110.4397908, 43.3366693],
          [-110.4394046, 43.3357986],
          [-110.4389587, 43.3348805],
          [-110.4392313, 43.3338498],
          [-110.4393646, 43.3325279],
          [-110.4397418, 43.3315208],
          [-110.4405349, 43.3311227],
          [-110.4408426, 43.3307921],
          [-110.44106, 43.3301667],
          [-110.440902, 43.3296851],
          [-110.4413396, 43.3293441],
          [-110.441255, 43.3287202],
          [-110.44104, 43.3278658],
          [-110.4411802, 43.3273513],
          [-110.4413477, 43.3270103],
          [-110.4416244, 43.326594],
          [-110.4422232, 43.3263276],
          [-110.4424402, 43.3259927],
          [-110.441737, 43.3256334],
          [-110.4412232, 43.3254386],
          [-110.4415793, 43.3251551],
          [-110.4424049, 43.3249668],
          [-110.4434415, 43.3245549],
          [-110.444331, 43.3242501],
          [-110.44475, 43.3237051],
          [-110.446349, 43.3226864],
          [-110.4484196, 43.3204976],
          [-110.4487193, 43.3194224],
          [-110.4489617, 43.3186409],
          [-110.4488729, 43.3182139],
          [-110.4490214, 43.3179026],
          [-110.4491586, 43.3175768],
          [-110.4493756, 43.3175785],
          [-110.4497078, 43.317796],
          [-110.4500336, 43.3177586],
          [-110.4506514, 43.3176758],
          [-110.4509602, 43.3175552],
          [-110.4513942, 43.3170455],
          [-110.4516338, 43.3161797],
          [-110.4523736, 43.315773],
          [-110.453363, 43.3157028],
          [-110.4542087, 43.3150385],
          [-110.4547306, 43.3143025],
          [-110.4549938, 43.3143073],
          [-110.4552908, 43.3142607],
          [-110.4556871, 43.3143882],
          [-110.4558913, 43.314806],
          [-110.4564538, 43.3148942],
          [-110.4571122, 43.3147357],
          [-110.4576456, 43.3142916],
          [-110.4580176, 43.3139176],
          [-110.4582105, 43.3133818],
          [-110.4577093, 43.312793],
          [-110.4575663, 43.3125991],
          [-110.4576738, 43.312064],
          [-110.4580101, 43.3114619],
          [-110.4584507, 43.310599],
          [-110.4585001, 43.3101923],
          [-110.4587274, 43.3099339],
          [-110.4600557, 43.3102201],
          [-110.4608047, 43.3112082],
          [-110.4609499, 43.3114747],
          [-110.4612088, 43.3115275],
          [-110.4615781, 43.3112514],
          [-110.4616716, 43.310882],
          [-110.4617884, 43.3103823],
          [-110.4618051, 43.3101484],
          [-110.4620558, 43.309836],
          [-110.4624217, 43.3095305],
          [-110.4627766, 43.3094015],
          [-110.463277, 43.309351],
          [-110.4640308, 43.3095011],
          [-110.464421, 43.3093281],
          [-110.4647694, 43.3087677],
          [-110.4655134, 43.3086474],
          [-110.4658709, 43.3084972],
          [-110.4659628, 43.3080544],
          [-110.4660862, 43.307267],
          [-110.4662302, 43.3069105],
          [-110.4662298, 43.3066757],
          [-110.4658139, 43.3063362],
          [-110.4656971, 43.3060863],
          [-110.4657986, 43.3058278],
          [-110.4662491, 43.3055433],
          [-110.4682143, 43.304005],
          [-110.4708288, 43.3032669],
          [-110.4715606, 43.3020414],
          [-110.473599, 43.3022267],
          [-110.4743107, 43.3005888],
          [-110.4776015, 43.3002694],
          [-110.4802213, 43.2981441],
          [-110.4834031, 43.2993597],
          [-110.4861446, 43.2958172],
          [-110.4870708, 43.2968638],
          [-110.4907847, 43.2965069],
          [-110.493864, 43.2960735],
          [-110.4957309, 43.2965467],
          [-110.4985736, 43.2958955],
          [-110.4987492, 43.2952958],
          [-110.5019168, 43.2962596],
          [-110.5030462, 43.2975934],
          [-110.5074016, 43.2983747],
          [-110.5109741, 43.2979922],
          [-110.5179277, 43.2978294],
          [-110.5203855, 43.2945469],
          [-110.5321585, 43.282851]
        ]
      }
    ]
  },
  {
    name: 'Hoback River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '13012500',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite; Paleozoic limestone and sandstone; Mesozoic shale and sandstone',
    fish_species: 'Brown trout, cutthroat trout, mountain whitefish',
    youtube_url: 'https://www.youtube.com/embed/ChtobICD5OY',
    description: 'Granite Creek to Snake River - Classic Intermediate Whitewater. Season: April to August. Class: II+/III- at lower water | III at high water. Gauge: None (visual assessment required). Length: 12 miles (shorter & longer runs possible).',
    usgs_data: {
      current_flow: null,
      record_high: 6260,
      record_low: 160,
      yearly_average: 1540
    },
    segments: [
      {
        name: 'Confluence Section',
        grade: 'II',
        coordinates: [
          [-110.5363248, 43.2876585],
          [-110.5650894, 43.2884558],
          [-110.5773289, 43.2811913],
          [-110.5962871, 43.2801784],
          [-110.618071, 43.2824721],
          [-110.63981, 43.2886284],
          [-110.665219, 43.29636],
          [-110.6775224, 43.3078804],
          [-110.6898532, 43.3155366],
          [-110.7100619, 43.3193615],
          [-110.7273631, 43.3198622],
          [-110.728937, 43.3202609],
          [-110.7312979, 43.320859]
        ]
      }
    ]
  },
  {
    name: 'Grays River',
    state: 'WY',
    grade: 'IV',
    usgs_gage: '13013200',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Paleozoic sandstone and limestone; Mesozoic shale; Quaternary glacial deposits',
    fish_species: 'Chinook salmon, coho salmon, steelhead, cutthroat trout',
    youtube_url: 'https://www.youtube.com/embed/0Q94FFs42oA',
    description: 'Squaw Creek to Bridge Campground - Short, Intense Technical Run. Season: April to November. Class: III/IV @ 2-4ft | IV/V- @ 4-7ft. Gauge: At Bridge Campground. Length: 2 miles. Shuttle: 2 miles, easy to run or bike.',
    usgs_data: {
      current_flow: null,
      record_high: 3780,
      record_low: 200,
      yearly_average: 890
    },
    segments: [
      {
        name: 'Alpine Section',
        grade: 'IV',
        coordinates: [
          [-110.8732062, 43.1458631],
          [-110.8751108, 43.1445356],
          [-110.8771709, 43.1440361],
          [-110.8787627, 43.1433409],
          [-110.8802778, 43.1431577],
          [-110.8826898, 43.1435275],
          [-110.8842777, 43.1425585],
          [-110.8860029, 43.1416325],
          [-110.8872054, 43.1414984],
          [-110.8885228, 43.1402414],
          [-110.8890151, 43.1394957],
          [-110.8901342, 43.1387947],
          [-110.891644, 43.1386676],
          [-110.8939218, 43.1384101],
          [-110.8951432, 43.1377285],
          [-110.8956548, 43.1366654],
          [-110.8961513, 43.1360951],
          [-110.8970471, 43.1360774],
          [-110.8983839, 43.1362945],
          [-110.8991492, 43.1360809],
          [-110.9000033, 43.1363795],
          [-110.9012681, 43.1368641],
          [-110.9016582, 43.1373309],
          [-110.9031308, 43.1386883],
          [-110.9042839, 43.13931],
          [-110.9073585, 43.1388612],
          [-110.9098955, 43.1393423],
          [-110.9104987, 43.1413419],
          [-110.9110144, 43.1419265],
          [-110.9124546, 43.1422924],
          [-110.9133764, 43.1420731],
          [-110.9145122, 43.1419913],
          [-110.9154897, 43.1413776],
          [-110.916185, 43.1407771],
          [-110.9180203, 43.1408355],
          [-110.9197136, 43.1405738],
          [-110.9217202, 43.1400425],
          [-110.9229605, 43.1403576],
          [-110.9233526, 43.1416961],
          [-110.9245798, 43.141801],
          [-110.9262209, 43.1423422],
          [-110.9286198, 43.1422904],
          [-110.9318079, 43.1422303],
          [-110.9338444, 43.1422519],
          [-110.937645, 43.1426405],
          [-110.9399751, 43.1433562],
          [-110.9422455, 43.1424951],
          [-110.9434213, 43.1420177],
          [-110.9453595, 43.1419305],
          [-110.9468138, 43.1416806],
          [-110.9475515, 43.1422395],
          [-110.9501007, 43.142546],
          [-110.952001, 43.1426545],
          [-110.9531433, 43.1424016],
          [-110.954307, 43.1424501],
          [-110.9555351, 43.1429011],
          [-110.9569933, 43.1423391],
          [-110.958539, 43.1424348],
          [-110.959835, 43.1418383],
          [-110.9633679, 43.1420321],
          [-110.9650244, 43.1421222],
          [-110.9656467, 43.1412746],
          [-110.96688, 43.1408971],
          [-110.9684167, 43.1411538],
          [-110.970307, 43.1420744],
          [-110.9713741, 43.1427106],
          [-110.9732194, 43.1427368],
          [-110.9741068, 43.1421817],
          [-110.9756519, 43.1428115],
          [-110.9770427, 43.1428599],
          [-110.9778117, 43.1433942],
          [-110.9782196, 43.1443477]
        ]
      }
    ]
  },
  {
    name: 'Green River',
    state: 'WY',
    grade: 'III',
    usgs_gage: '09210000',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite; Paleozoic limestone and sandstone; Mesozoic shale; Tertiary volcanic rock',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 31000,
      record_low: 720,
      yearly_average: 5200
    },
    segments: [
      {
        name: 'Upper Green - Seedskadee',
        grade: 'III',
        coordinates: [
          [-109.8900, 42.8200],
          [-109.8700, 42.8500],
          [-109.8500, 42.8800],
          [-109.8300, 42.9100],
          [-109.8100, 42.9400]
        ]
      }
    ]
  },
  {
    name: 'Wind River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '09255000',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and shale; Mesozoic sandstone',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 9500,
      record_low: 420,
      yearly_average: 2100
    },
    segments: [
      {
        name: 'Middle Wind River',
        grade: 'II',
        coordinates: [
          [-108.4500, 43.2200],
          [-108.4300, 43.2500],
          [-108.4100, 43.2800],
          [-108.3900, 43.3100],
          [-108.3700, 43.3400]
        ]
      }
    ]
  },
  {
    name: 'Bighorn River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '06294000',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite; Paleozoic limestone and sandstone; Mesozoic shale and sandstone',
    fish_species: 'Walleye, catfish, brown trout',
    youtube_url: 'https://www.youtube.com/embed/ccd_nN4pfv8',
    usgs_data: {
      current_flow: null,
      record_high: 18400,
      record_low: 890,
      yearly_average: 4350
    },
    segments: [
      {
        name: 'Wind River Canyon (Thermopolis to Shoshoni)',
        grade: 'II',
        coordinates: [
          [-108.2200, 43.6500],
          [-108.2000, 43.6600],
          [-108.1800, 43.6700],
          [-108.1600, 43.6800],
          [-108.1400, 43.6900],
          [-108.1200, 43.7000],
          [-108.1000, 43.7100],
          [-108.0800, 43.7200],
          [-108.0600, 43.7300],
          [-108.0400, 43.7400],
          [-108.0200, 43.7500],
          [-108.0000, 43.7600],
          [-107.9800, 43.7700],
          [-107.9600, 43.7800]
        ]
      },
      {
        name: 'Lower Bighorn Canyon',
        grade: 'II',
        coordinates: [
          [-107.9200, 44.8300],
          [-107.9000, 44.8600],
          [-107.8800, 44.8900],
          [-107.8600, 44.9200],
          [-107.8400, 44.9500]
        ]
      }
    ]
  },
  {
    name: 'North Platte River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '06627000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 8900,
      record_low: 310,
      yearly_average: 1890
    },
    segments: [
      {
        name: 'Upper North Platte',
        grade: 'II',
        coordinates: [
          [-106.8200, 41.1400],
          [-106.8000, 41.1700],
          [-106.7800, 41.2000],
          [-106.7600, 41.2300],
          [-106.7400, 41.2600]
        ]
      }
    ]
  },
  {
    name: 'Shoshone River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '06281000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 9200,
      record_low: 420,
      yearly_average: 2340
    },
    segments: [
      {
        name: 'Middle Shoshone',
        grade: 'II',
        coordinates: [
          [-108.8200, 44.3400],
          [-108.8000, 44.3700],
          [-108.7800, 44.4000],
          [-108.7600, 44.4300],
          [-108.7400, 44.4600]
        ]
      }
    ]
  },
  {
    name: 'Laramie River',
    state: 'WY',
    grade: 'II',
    usgs_gage: '06622500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 4250,
      record_low: 180,
      yearly_average: 920
    },
    segments: [
      {
        name: 'Middle Laramie',
        grade: 'II',
        coordinates: [
          [-106.0200, 41.3800],
          [-106.0000, 41.4100],
          [-105.9800, 41.4400],
          [-105.9600, 41.4700],
          [-105.9400, 41.5000]
        ]
      }
    ]
  },
  {
    name: 'Powder River',
    state: 'WY',
    grade: 'I',
    usgs_gage: '06321000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 6800,
      record_low: 120,
      yearly_average: 890
    },
    segments: [
      {
        name: 'Lower Powder River',
        grade: 'I',
        coordinates: [
          [-105.9000, 46.1200],
          [-105.8800, 46.1500],
          [-105.8600, 46.1800],
          [-105.8400, 46.2100],
          [-105.8200, 46.2400]
        ]
      }
    ]
  },
  {
    name: 'Tongue River',
    state: 'WY',
    grade: 'I',
    usgs_gage: '06308500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 4200,
      record_low: 145,
      yearly_average: 650
    },
    segments: [
      {
        name: 'Middle Tongue River',
        grade: 'I',
        coordinates: [
          [-106.2000, 45.2800],
          [-106.1800, 45.3100],
          [-106.1600, 45.3400],
          [-106.1400, 45.3700],
          [-106.1200, 45.4000]
        ]
      }
    ]
  },
  {
    name: 'Belle Fourche River',
    state: 'WY',
    grade: 'I',
    usgs_gage: '06331500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 3100,
      record_low: 95,
      yearly_average: 450
    },
    segments: [
      {
        name: 'Lower Belle Fourche',
        grade: 'I',
        coordinates: [
          [-103.8000, 44.2500],
          [-103.7800, 44.2800],
          [-103.7600, 44.3100],
          [-103.7400, 44.3400],
          [-103.7200, 44.3700]
        ]
      }
    ]
  },
  {
    name: 'Colorado River',
    state: 'CO',
    grade: 'III',
    usgs_gage: '09070500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 15600,
      record_low: 890,
      yearly_average: 4200
    },
    segments: [
      {
        name: 'Upper Colorado - Glenwood Springs',
        grade: 'III',
        coordinates: [
          [-107.3200, 39.5500],
          [-107.3000, 39.5800],
          [-107.2800, 39.6100],
          [-107.2600, 39.6400],
          [-107.2400, 39.6700]
        ]
      }
    ]
  },
  {
    name: 'Roaring Fork River',
    state: 'CO',
    grade: 'III',
    usgs_gage: '09081600',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 8900,
      record_low: 420,
      yearly_average: 1890
    },
    segments: [
      {
        name: 'Lower Roaring Fork',
        grade: 'III',
        coordinates: [
          [-107.1800, 39.5200],
          [-107.1600, 39.5500],
          [-107.1400, 39.5800],
          [-107.1200, 39.6100],
          [-107.1000, 39.6400]
        ]
      }
    ]
  },
  {
    name: 'Arkansas River',
    state: 'CO',
    grade: 'III',
    usgs_gage: '07087200',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 12400,
      record_low: 560,
      yearly_average: 2890
    },
    segments: [
      {
        name: 'Browns Canyon',
        grade: 'III',
        coordinates: [
          [-106.2500, 38.8200],
          [-106.2300, 38.8500],
          [-106.2100, 38.8800],
          [-106.1900, 38.9100],
          [-106.1700, 38.9400]
        ]
      }
    ]
  },
  {
    name: 'South Platte River',
    state: 'CO',
    grade: 'II',
    usgs_gage: '06710500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 6200,
      record_low: 280,
      yearly_average: 1240
    },
    segments: [
      {
        name: 'Middle South Platte',
        grade: 'II',
        coordinates: [
          [-105.0800, 39.7800],
          [-105.0600, 39.8100],
          [-105.0400, 39.8400],
          [-105.0200, 39.8700],
          [-105.0000, 39.9000]
        ]
      }
    ]
  },
  {
    name: 'Green River - Utah',
    state: 'UT',
    grade: 'III',
    usgs_gage: '09315000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 25300,
      record_low: 890,
      yearly_average: 4100
    },
    segments: [
      {
        name: 'Dinosaur National Monument',
        grade: 'III',
        coordinates: [
          [-109.3600, 40.4200],
          [-109.3400, 40.4500],
          [-109.3200, 40.4800],
          [-109.3000, 40.5100],
          [-109.2800, 40.5400]
        ]
      }
    ]
  },
  {
    name: 'Colorado River - Utah',
    state: 'UT',
    grade: 'III',
    usgs_gage: '09402500',
    usgs_data: {
      current_flow: null,
      record_high: 22600,
      record_low: 1020,
      yearly_average: 5100
    },
    segments: [
      {
        name: 'Cataract Canyon',
        grade: 'III',
        coordinates: [
          [-109.9800, 38.2300],
          [-109.9600, 38.2600],
          [-109.9400, 38.2900],
          [-109.9200, 38.3200],
          [-109.9000, 38.3500]
        ]
      }
    ]
  },
  {
    name: 'Provo River',
    state: 'UT',
    grade: 'II',
    usgs_gage: '10171000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 4200,
      record_low: 190,
      yearly_average: 890
    },
    segments: [
      {
        name: 'Middle Provo',
        grade: 'II',
        coordinates: [
          [-111.4500, 40.2800],
          [-111.4300, 40.3100],
          [-111.4100, 40.3400],
          [-111.3900, 40.3700],
          [-111.3700, 40.4000]
        ]
      }
    ]
  },
  {
    name: 'Paria River',
    state: 'UT',
    grade: 'III',
    usgs_gage: '09402200',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 6800,
      record_low: 45,
      yearly_average: 320
    },
    segments: [
      {
        name: 'Paria Canyon',
        grade: 'III',
        coordinates: [
          [-111.5800, 37.0400],
          [-111.5600, 37.0700],
          [-111.5400, 37.1000],
          [-111.5200, 37.1300],
          [-111.5000, 37.1600]
        ]
      }
    ]
  },
  {
    name: 'Bear River',
    state: 'ID',
    grade: 'II',
    usgs_gage: '10077000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 8900,
      record_low: 320,
      yearly_average: 1820
    },
    segments: [
      {
        name: 'Middle Bear River',
        grade: 'II',
        coordinates: [
          [-111.5200, 42.8400],
          [-111.5000, 42.8700],
          [-111.4800, 42.9000],
          [-111.4600, 42.9300],
          [-111.4400, 42.9600]
        ]
      }
    ]
  },
  {
    name: 'Payette River',
    state: 'ID',
    grade: 'III',
    usgs_gage: '13185000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 9800,
      record_low: 450,
      yearly_average: 2340
    },
    segments: [
      {
        name: 'North Fork Payette',
        grade: 'III',
        coordinates: [
          [-115.8200, 44.9200],
          [-115.8000, 44.9500],
          [-115.7800, 44.9800],
          [-115.7600, 45.0100],
          [-115.7400, 45.0400]
        ]
      }
    ]
  },
  {
    name: 'Salmon River',
    state: 'ID',
    grade: 'IV',
    usgs_gage: '13329500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/E4e5utiqGLQ',
    usgs_data: {
      current_flow: null,
      record_high: 34200,
      record_low: 2100,
      yearly_average: 8900
    },
    segments: [
      {
        name: 'Middle Salmon - Main Stem',
        grade: 'IV',
        coordinates: [
          [-115.2941977, 44.5320813],
          [-115.2945688, 44.5326104],
          [-115.2943626, 44.5331689],
          [-115.2940739, 44.5341683],
          [-115.2918061, 44.535873],
          [-115.2908577, 44.5401348],
          [-115.2902392, 44.5420745],
          [-115.2902804, 44.5431134],
          [-115.2923833, 44.5434367],
          [-115.2938678, 44.5449648],
          [-115.2943213, 44.5457289],
          [-115.2941152, 44.5479035],
          [-115.2940739, 44.5489027],
          [-115.2974139, 44.5509596],
          [-115.2984036, 44.5516942],
          [-115.2982522, 44.552409],
          [-115.2971802, 44.5527616],
          [-115.2971389, 44.553173],
          [-115.2980048, 44.5537019],
          [-115.298376, 44.5543777],
          [-115.2982522, 44.5556999],
          [-115.2991182, 44.5569927],
          [-115.2996955, 44.5586381],
          [-115.2998604, 44.559637],
          [-115.2995108, 44.5608809],
          [-115.2991397, 44.5611747],
          [-115.2987273, 44.5616154],
          [-115.2987273, 44.562438],
          [-115.3000056, 44.5628199],
          [-115.3007066, 44.5631724],
          [-115.300954, 44.5641419],
          [-115.3005829, 44.5648176],
          [-115.300789, 44.5654639],
          [-115.3012426, 44.5658752],
          [-115.3015313, 44.5664921],
          [-115.3012014, 44.5667859],
          [-115.3007066, 44.5671678],
          [-115.3001293, 44.5677259],
          [-115.3002118, 44.568431],
          [-115.3018611, 44.568901],
          [-115.3021498, 44.5693416],
          [-115.3023559, 44.5697822],
          [-115.3027683, 44.5706929],
          [-115.3029332, 44.5714566],
          [-115.3024854, 44.5727413],
          [-115.3039286, 44.5740337],
          [-115.304176, 44.5761485],
          [-115.3044646, 44.5783808],
          [-115.3049595, 44.5796731],
          [-115.3007123, 44.5845483],
          [-115.3002037, 44.5852043],
          [-115.2954617, 44.5870544],
          [-115.2945133, 44.593133],
          [-115.2921087, 44.5942457],
          [-115.2909129, 44.5953908],
          [-115.2911603, 44.5967708],
          [-115.2899645, 44.5986206],
          [-115.2861888, 44.6011014],
          [-115.283591, 44.6022758],
          [-115.2832611, 44.6031859],
          [-115.2831374, 44.6056813],
          [-115.2818179, 44.6072959],
          [-115.2810345, 44.6106131],
          [-115.2804984, 44.6115231],
          [-115.2791789, 44.6122276],
          [-115.2776532, 44.6113176],
          [-115.2763337, 44.6112589],
          [-115.274973, 44.610936],
          [-115.2734061, 44.610936],
          [-115.2726639, 44.610525],
          [-115.2699836, 44.6087637],
          [-115.2675096, 44.6075308],
          [-115.2660664, 44.6069143],
          [-115.2618586, 44.6060577],
          [-115.2600442, 44.6061751],
          [-115.2588897, 44.6107839],
          [-115.2578176, 44.6147173],
          [-115.2564957, 44.615542],
          [-115.2517537, 44.6164226],
          [-115.2502281, 44.6174499],
          [-115.2489086, 44.6179782],
          [-115.2458572, 44.6187413],
          [-115.2432182, 44.6188587],
          [-115.2409503, 44.6203556],
          [-115.2376103, 44.6214415],
          [-115.2344765, 44.6217056],
          [-115.2331245, 44.6207887],
          [-115.2323823, 44.6197615],
          [-115.2308978, 44.6189984],
          [-115.2279702, 44.6183527],
          [-115.2253312, 44.6180592],
          [-115.2232695, 44.6190277],
          [-115.2216171, 44.6206213],
          [-115.2221944, 44.6219126],
          [-115.2239675, 44.6235268],
          [-115.2254931, 44.6250529],
          [-115.2262989, 44.6283795],
          [-115.222208, 44.6309176],
          [-115.2193759, 44.6289767],
          [-115.217278, 44.6286781],
          [-115.2150752, 44.6262146],
          [-115.2127675, 44.6253934],
          [-115.2095158, 44.629126],
          [-115.2055298, 44.6281556],
          [-115.2009145, 44.6244229],
          [-115.1987117, 44.6244229],
          [-115.1968236, 44.6262893],
          [-115.1956698, 44.6288274],
          [-115.1968236, 44.6309176],
          [-115.1915789, 44.634202],
          [-115.1868586, 44.6371877],
          [-115.1837118, 44.6369638],
          [-115.1810894, 44.6403225],
          [-115.1806699, 44.6440541],
          [-115.1796209, 44.6462184],
          [-115.1771035, 44.6459945],
          [-115.1749007, 44.646293],
          [-115.1721734, 44.6475617],
          [-115.168607, 44.6471139],
          [-115.1677679, 44.6474124],
          [-115.1679777, 44.6503974],
          [-115.1654602, 44.6506959],
          [-115.1649359, 44.6548648],
          [-115.1634674, 44.658297],
          [-115.1654604, 44.6611323],
          [-115.1592716, 44.6648626],
          [-115.1595864, 44.6679212],
          [-115.1563347, 44.6697862],
          [-115.1552857, 44.6734414],
          [-115.1533976, 44.6749332],
          [-115.1523487, 44.6800798],
          [-115.1508802, 44.6850021],
          [-115.1502519, 44.6922382],
          [-115.1466855, 44.6940279],
          [-115.1501471, 44.6960411],
          [-115.1483639, 44.7019314],
          [-115.1417555, 44.7104302],
          [-115.1390283, 44.7140082],
          [-115.1400772, 44.719524],
          [-115.1438534, 44.7191513],
          [-115.1463709, 44.7205674],
          [-115.1481541, 44.7216854],
          [-115.1501471, 44.724443],
          [-115.151722, 44.7291411],
          [-115.1438549, 44.732569],
          [-115.13882, 44.7381575],
          [-115.1355869, 44.7443492],
          [-115.1172304, 44.7555234],
          [-115.1048529, 44.7602159],
          [-115.0959369, 44.765057],
          [-115.0904824, 44.7678869],
          [-115.0900628, 44.7707168],
          [-115.085867, 44.7710892],
          [-115.0792587, 44.7698977],
          [-115.0754825, 44.769004],
          [-115.0746433, 44.7651315],
          [-115.070972, 44.7635675],
          [-115.0686643, 44.7595456],
          [-115.041101, 44.7521945],
          [-115.0344213, 44.7466327],
          [-115.0334999, 44.7386162],
          [-115.0332696, 44.736162],
          [-115.0279719, 44.7366528],
          [-115.0219832, 44.7405795],
          [-115.0210619, 44.7435244],
          [-115.0176069, 44.7435244],
          [-115.0146125, 44.7394343],
          [-115.0130002, 44.7363256],
          [-115.0178372, 44.7307623],
          [-115.0150732, 44.7250348],
          [-115.0127698, 44.7179974],
          [-115.0098634, 44.7135699],
          [-115.0045657, 44.7168435],
          [-115.003414, 44.7209352],
          [-114.9983466, 44.7209352],
          [-115.0008803, 44.7266631],
          [-114.9946613, 44.7282995],
          [-114.9875209, 44.7292814],
          [-114.9799199, 44.7302632],
          [-114.9741615, 44.7291177],
          [-114.9723188, 44.7279722],
          [-114.9700155, 44.7245356],
          [-114.9644875, 44.7242083],
          [-114.9578078, 44.7222445],
          [-114.9534314, 44.7215898],
          [-114.9453697, 44.7237174],
          [-114.942836, 44.7258448],
          [-114.9432454, 44.7309751],
          [-114.9273523, 44.7332659],
          [-114.9144535, 44.7466818],
          [-114.9158355, 44.7499535],
          [-114.9130715, 44.756987],
          [-114.9059312, 44.7576413],
          [-114.8967178, 44.7594404],
          [-114.8955661, 44.7643468],
          [-114.8898077, 44.7669634],
          [-114.8822067, 44.7721962],
          [-114.8743753, 44.777592],
          [-114.865853, 44.7803715],
          [-114.8584823, 44.7846221],
          [-114.8552576, 44.7846221],
          [-114.8552576, 44.7823333],
          [-114.8524936, 44.7823333],
          [-114.8504205, 44.7849491],
          [-114.8497295, 44.7874013],
          [-114.8423588, 44.7895264],
          [-114.8416678, 44.7924688],
          [-114.8331455, 44.8026024],
          [-114.8260051, 44.8022755],
          [-114.8172526, 44.8063611],
          [-114.8137976, 44.8063611],
          [-114.8110336, 44.8099562],
          [-114.8078089, 44.8133878],
          [-114.8084999, 44.8164923],
          [-114.8061966, 44.8194333],
          [-114.8032022, 44.8207403],
          [-114.8011292, 44.8233543],
          [-114.7960618, 44.824988],
          [-114.7942192, 44.828092],
          [-114.7937585, 44.835606],
          [-114.7923765, 44.8362593],
          [-114.7891518, 44.8339726],
          [-114.7859271, 44.8352793],
          [-114.7840848, 44.8405058],
          [-114.7721074, 44.8418124],
          [-114.768422, 44.8414857],
          [-114.7658883, 44.8427923],
          [-114.765658, 44.8454053],
          [-114.767731, 44.8472017],
          [-114.7702647, 44.8496512],
          [-114.7702647, 44.8522639],
          [-114.766349, 44.8530804],
          [-114.7619727, 44.8542234],
          [-114.7610513, 44.8566726],
          [-114.7610513, 44.8579788],
          [-114.7631243, 44.8599381],
          [-114.766349, 44.8623871],
          [-114.7699013, 44.8651217],
          [-114.768289, 44.8687132],
          [-114.7692103, 44.8724677],
          [-114.766216, 44.8742632],
          [-114.7609183, 44.8754058],
          [-114.7553902, 44.8732839],
          [-114.7514746, 44.8737736],
          [-114.7530869, 44.8772013],
          [-114.7500925, 44.8793231],
          [-114.7401882, 44.8796495],
          [-114.7344298, 44.8788334],
          [-114.7316658, 44.8806288],
          [-114.7309748, 44.8824241],
          [-114.7314354, 44.8855249],
          [-114.7231434, 44.8904206],
          [-114.7231434, 44.8925419],
          [-114.7252164, 44.8925419],
          [-114.7270591, 44.8927051],
          [-114.7316658, 44.8935209],
          [-114.7305141, 44.8976001],
          [-114.7270591, 44.8993949],
          [-114.7270592, 44.9039632],
          [-114.7318962, 44.9077154],
          [-114.7328175, 44.9147297],
          [-114.7293625, 44.9173395],
          [-114.7289018, 44.9196229],
          [-114.7353512, 44.9245157],
          [-114.7348905, 44.9269619],
          [-114.7261378, 44.9297342],
          [-114.7231435, 44.9334847],
          [-114.7272895, 44.9419632],
          [-114.7259075, 44.946202],
          [-114.7282108, 44.9479952],
          [-114.7353512, 44.9497884],
          [-114.7300535, 44.9686949],
          [-114.7362725, 44.9730946],
          [-114.7328175, 44.9801009],
          [-114.7305142, 44.993948],
          [-114.7284412, 45.0035577],
          [-114.7231435, 45.0056748],
          [-114.7217615, 45.0099089],
          [-114.7293625, 45.0131656],
          [-114.7247558, 45.0180504],
          [-114.7270592, 45.0237489],
          [-114.7247558, 45.0314001],
          [-114.7247558, 45.0338418],
          [-114.7261378, 45.0354695],
          [-114.7226828, 45.0392131],
          [-114.7224525, 45.0421427],
          [-114.7263682, 45.0447467],
          [-114.7252165, 45.0488151],
          [-114.7233738, 45.0502797],
          [-114.7242952, 45.054185],
          [-114.7231435, 45.0563003],
          [-114.7247558, 45.057602],
          [-114.7245255, 45.0593917],
          [-114.7268288, 45.0603679],
          [-114.7252165, 45.0641099],
          [-114.7282108, 45.0711051],
          [-114.7277501, 45.0785874],
          [-114.7173851, 45.0888332],
          [-114.7335085, 45.0938742],
          [-114.7299699, 45.099598],
          [-114.7306609, 45.1061011],
          [-114.7260543, 45.1093524],
          [-114.7225992, 45.1194302],
          [-114.7262846, 45.1282062],
          [-114.7322733, 45.1517648],
          [-114.7131555, 45.18822],
          [-114.6969034, 45.189206],
          [-114.680089, 45.2244212],
          [-114.6630442, 45.2364251],
          [-114.6579769, 45.2485886],
          [-114.6480725, 45.2545883],
          [-114.6466905, 45.2591282],
          [-114.6314884, 45.2678827],
          [-114.6151346, 45.2782567],
          [-114.6082246, 45.2819844],
          [-114.5929, 45.2964426],
          [-114.5828239, 45.297228],
          [-114.5797349, 45.3015736],
          [-114.573763, 45.3025875],
          [-114.5688207, 45.2998354],
          [-114.5554353, 45.3002699],
          [-114.5434915, 45.3044704],
          [-114.5327832, 45.3005596],
          [-114.5239283, 45.2996905],
          [-114.5181623, 45.3024426],
          [-114.5084835, 45.3080913],
          [-114.4880966, 45.3098292],
          [-114.4633851, 45.3172148],
          [-114.4296128, 45.3259024],
          [-114.4102555, 45.3179388],
          [-114.3906561, 45.3222977],
          [-114.3743592, 45.3216237],
          [-114.3686074, 45.3330813],
          [-114.348476, 45.3324074],
          [-114.3206754, 45.3526213],
          [-114.3015026, 45.3633991],
          [-114.273702, 45.3741748]
        ]
      }
    ]
  },
  {
    name: 'Selway River',
    state: 'ID',
    grade: 'IV',
    usgs_gage: '13337000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 18900,
      record_low: 890,
      yearly_average: 3420
    },
    segments: [
      {
        name: 'Middle Selway',
        grade: 'IV',
        coordinates: [
          [-115.5600, 45.3800],
          [-115.5400, 45.4100],
          [-115.5200, 45.4400],
          [-115.5000, 45.4700],
          [-115.4800, 45.5000]
        ]
      }
    ]
  },
  {
    name: 'Clearwater River',
    state: 'ID',
    grade: 'II',
    usgs_gage: '13342500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 14200,
      record_low: 2100,
      yearly_average: 5600
    },
    segments: [
      {
        name: 'Lower Clearwater',
        grade: 'II',
        coordinates: [
          [-116.2200, 46.1800],
          [-116.2000, 46.2100],
          [-116.1800, 46.2400],
          [-116.1600, 46.2700],
          [-116.1400, 46.3000]
        ]
      }
    ]
  },
  {
    name: 'Teton River',
    state: 'ID',
    grade: 'IV',
    usgs_gage: '13043000',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Quaternary glacial deposits and moraines',
    fish_species: 'Cutthroat trout, brown trout, whitefish',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    description: 'Highway 33 to Felt Power Plant - Idaho Class IV-V Run. Season: April to October. Class: IV-V. Gauge: Driggs and St. Anthony. Length: 7 miles.',
    usgs_data: {
      current_flow: null,
      record_high: 8900,
      record_low: 420,
      yearly_average: 2100
    },
    segments: [
      {
        name: 'Upper Teton Canyon',
        grade: 'IV',
        coordinates: [
          [-111.5400, 43.8200],
          [-111.5200, 43.8300],
          [-111.5000, 43.8400],
          [-111.4800, 43.8500],
          [-111.4600, 43.8600],
          [-111.4400, 43.8700],
          [-111.4200, 43.8800],
          [-111.4000, 43.8900]
        ]
      }
    ]
  },
  {
    name: 'Bitch Creek',
    state: 'ID',
    grade: 'IV',
    usgs_gage: '13042500',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Quaternary glacial deposits',
    fish_species: 'Cutthroat trout, brown trout, whitefish',
    youtube_url: 'https://www.youtube.com/embed/s3DzGxQNZiI',
    description: 'Highway 32 Bridge to France Boat Ramp - Remote Expert-Level Adventure. Season: Runoff, May to July. Class: III/IV(V). Gauge: On old bridge at put-in (hopefully above 3ft). Length: 13 miles.',
    usgs_data: {
      current_flow: null,
      record_high: 12000,
      record_low: 600,
      yearly_average: 2800
    },
    segments: [
      {
        name: 'Remote Upper Section',
        grade: 'IV',
        coordinates: [
          [-111.6200, 43.9500],
          [-111.6000, 43.9600],
          [-111.5800, 43.9700],
          [-111.5600, 43.9800],
          [-111.5400, 43.9900],
          [-111.5200, 44.0000],
          [-111.5000, 44.0100],
          [-111.4800, 44.0200],
          [-111.4600, 44.0300],
          [-111.4400, 44.0400]
        ]
      }
    ]
  },
  {
    name: 'Missouri River',
    state: 'MT',
    grade: 'I',
    usgs_gage: '06054500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 23800,
      record_low: 3200,
      yearly_average: 8900
    },
    segments: [
      {
        name: 'Upper Missouri - Fort Peck Lake',
        grade: 'I',
        coordinates: [
          [-110.4200, 48.3400],
          [-110.4000, 48.3700],
          [-110.3800, 48.4000],
          [-110.3600, 48.4300],
          [-110.3400, 48.4600]
        ]
      }
    ]
  },
  {
    name: 'Yellowstone River',
    state: 'MT',
    grade: 'II',
    usgs_gage: '06329500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 16800,
      record_low: 1540,
      yearly_average: 5100
    },
    segments: [
      {
        name: 'Upper Yellowstone',
        grade: 'II',
        coordinates: [
          [-110.5800, 45.4200],
          [-110.5600, 45.4500],
          [-110.5400, 45.4800],
          [-110.5200, 45.5100],
          [-110.5000, 45.5400]
        ]
      }
    ]
  },
  {
    name: 'Gallatin River',
    state: 'MT',
    grade: 'III',
    usgs_gage: '06292000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/88tRCgXgJy4',
    usgs_data: {
      current_flow: null,
      record_high: 8900,
      record_low: 620,
      yearly_average: 2100
    },
    segments: [
      {
        name: 'Middle Gallatin',
        grade: 'III',
        coordinates: [
          [-111.0200, 45.3200],
          [-111.0000, 45.3500],
          [-110.9800, 45.3800],
          [-110.9600, 45.4100],
          [-110.9400, 45.4400]
        ]
      }
    ]
  },
  {
    name: 'Madison River',
    state: 'MT',
    grade: 'II',
    usgs_gage: '06295000',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 12300,
      record_low: 890,
      yearly_average: 3200
    },
    segments: [
      {
        name: 'Lower Madison',
        grade: 'II',
        coordinates: [
          [-111.5600, 45.6200],
          [-111.5400, 45.6500],
          [-111.5200, 45.6800],
          [-111.5000, 45.7100],
          [-111.4800, 45.7400]
        ]
      }
    ]
  },
  {
    name: 'Flathead River',
    state: 'MT',
    grade: 'III',
    usgs_gage: '12362500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 15600,
      record_low: 2100,
      yearly_average: 5890
    },
    segments: [
      {
        name: 'Middle Flathead',
        grade: 'III',
        coordinates: [
          [-114.2200, 48.5800],
          [-114.2000, 48.6100],
          [-114.1800, 48.6400],
          [-114.1600, 48.6700],
          [-114.1400, 48.7000]
        ]
      }
    ]
  },
  {
    name: 'Clark Fork River',
    state: 'MT',
    grade: 'II',
    usgs_gage: '12334500',
    forum_url: 'https://www.americanwhitewater.org',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    usgs_data: {
      current_flow: null,
      record_high: 18900,
      record_low: 1200,
      yearly_average: 4560
    },
    segments: [
      {
        name: 'Upper Clark Fork',
        grade: 'II',
        coordinates: [
          [-113.8200, 46.8400],
          [-113.8000, 46.8700],
          [-113.7800, 46.9000],
          [-113.7600, 46.9300],
          [-113.7400, 46.9600]
        ]
      }
    ]
  },
  {
    name: 'Gros Ventre River',
    state: 'WY',
    grade: 'IV',
    usgs_gage: '13010100',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary glacial deposits',
    fish_species: 'Cutthroat trout, brown trout, mountain whitefish, sculpin',
    youtube_url: 'https://www.youtube.com/embed/7V65kQC8cGQ',
    description: 'Slide Lake to Park Boundary - Technical Runoff Challenge. Season: Runoff, May to late July. Class: III+/IV- @ 0-4 ft | IV above 4 ft. Length: 3 miles. Shuttle: 3 miles, easy to run or bike. Distance from Rendezvous River Sports to take-out: 19 miles.',
    usgs_data: {
      current_flow: null,
      record_high: 12500,
      record_low: 420,
      yearly_average: 3200
    },
    segments: [
      {
        name: 'Upper Gros Ventre',
        grade: 'IV',
        coordinates: [
          [-110.5442643, 43.6288984],
          [-110.5449418, 43.6289195],
          [-110.5456168, 43.6290522],
          [-110.5463521, 43.6292189],
          [-110.5470184, 43.6294803],
          [-110.5477225, 43.6300515],
          [-110.548353, 43.6303984],
          [-110.5493643, 43.6306909],
          [-110.55023, 43.6307962],
          [-110.5509648, 43.6307936],
          [-110.5519064, 43.6306002],
          [-110.5527928, 43.6304691],
          [-110.5532479, 43.6305838],
          [-110.5538678, 43.6308337],
          [-110.5551444, 43.6306132],
          [-110.5567892, 43.6307856],
          [-110.5590112, 43.6307334],
          [-110.5614086, 43.6295766],
          [-110.5623779, 43.6293178],
          [-110.5639624, 43.6291425],
          [-110.5655021, 43.6293644],
          [-110.5686495, 43.6300286],
          [-110.5715105, 43.6313969],
          [-110.5727847, 43.6324066],
          [-110.5726968, 43.6333221],
          [-110.5727342, 43.6337205],
          [-110.5733172, 43.6344528],
          [-110.5740502, 43.6355774],
          [-110.5742145, 43.6365298],
          [-110.5733896, 43.6373728],
          [-110.572835, 43.6376298],
          [-110.5734007, 43.6382277],
          [-110.5756156, 43.639205],
          [-110.5768104, 43.6396206],
          [-110.5778815, 43.6396806],
          [-110.5781854, 43.6395096],
          [-110.5781535, 43.6393495],
          [-110.5780432, 43.6389046],
          [-110.5782311, 43.6386496],
          [-110.5786249, 43.6385603],
          [-110.5794952, 43.6384787],
          [-110.5805123, 43.6386975],
          [-110.5809284, 43.6388959],
          [-110.58173, 43.6393038],
          [-110.5825947, 43.6395779],
          [-110.583171, 43.6399295],
          [-110.5837256, 43.6401632],
          [-110.584394, 43.6402565]
        ]
      }
    ]
  },
  {
    name: 'Gallatin River - Upper Reaches',
    state: 'MT',
    grade: 'I',
    usgs_gage: '06044500',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone; Quaternary glacial deposits',
    fish_species: 'Brown trout, cutthroat trout, rainbow trout',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    description: 'Upper & Lower Reaches - Mellow, scenic floats perfect for beginners, families, and fly fishing. Generally Class I-II with beautiful views near Big Sky and downstream areas.',
    usgs_data: {
      current_flow: null,
      record_high: 16800,
      record_low: 320,
      yearly_average: 2800
    },
    segments: [
      {
        name: 'Upper Gallatin Float',
        grade: 'I',
        youtube_url: 'https://www.youtube.com/embed/placeholder',
        coordinates: [
          [-110.9503, 45.2850],
          [-110.9450, 45.2820],
          [-110.9400, 45.2790],
          [-110.9350, 45.2760],
          [-110.9300, 45.2730],
          [-110.9250, 45.2700],
          [-110.9200, 45.2670],
          [-110.9150, 45.2640],
          [-110.9100, 45.2610],
          [-110.9050, 45.2580]
        ]
      }
    ]
  },
  {
    name: 'Gallatin River - Canyon Section',
    state: 'MT',
    grade: 'II',
    usgs_gage: '06044500',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone',
    fish_species: 'Brown trout, cutthroat trout, rainbow trout',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    description: 'Gallatin Canyon (Bozeman area) - Fast, continuous section with tight turns and rocky, technical maneuvering. Primarily Class II-III whitewater with stunning canyon views.',
    usgs_data: {
      current_flow: null,
      record_high: 16800,
      record_low: 320,
      yearly_average: 2800
    },
    segments: [
      {
        name: 'Gallatin Canyon - Technical Section',
        grade: 'II',
        youtube_url: 'https://www.youtube.com/embed/placeholder',
        coordinates: [
          [-110.8800, 45.3200],
          [-110.8750, 45.3170],
          [-110.8700, 45.3140],
          [-110.8650, 45.3110],
          [-110.8600, 45.3080],
          [-110.8550, 45.3050],
          [-110.8500, 45.3020],
          [-110.8450, 45.2990],
          [-110.8400, 45.2960],
          [-110.8350, 45.2930]
        ]
      }
    ]
  },
  {
    name: 'Gallatin River - Mad Mile',
    state: 'MT',
    grade: 'III',
    usgs_gage: '06044500',
    forum_url: 'https://www.americanwhitewater.org',
    geology: 'Precambrian granite and metamorphic rock; Paleozoic limestone and sandstone; Mesozoic shale and sandstone',
    fish_species: 'Brown trout, cutthroat trout, rainbow trout',
    youtube_url: 'https://www.youtube.com/embed/placeholder',
    description: 'The "Mad Mile" - Infamous two-mile stretch dropping nearly 100 feet per mile with intense, challenging whitewater. Class III-IV (bumps to Class IV during spring snowmelt May-June). Expert-only section requiring serious paddling skills.',
    usgs_data: {
      current_flow: null,
      record_high: 16800,
      record_low: 320,
      yearly_average: 2800
    },
    segments: [
      {
        name: 'House Rock - Mad Mile',
        grade: 'III',
        youtube_url: 'https://www.youtube.com/embed/placeholder',
        coordinates: [
          [-111.2466602, 45.458224],
          [-111.2453874, 45.4575863],
          [-111.2448938, 45.4569121],
          [-111.2444782, 45.4559646],
          [-111.2439587, 45.4554179],
          [-111.2433612, 45.4550535],
          [-111.2426858, 45.4549989],
          [-111.2415948, 45.4548166],
          [-111.2405038, 45.4546891],
          [-111.2395687, 45.454434],
          [-111.2383737, 45.4540331],
          [-111.2373607, 45.453614],
          [-111.2361657, 45.4528486],
          [-111.2360359, 45.452138],
          [-111.2360099, 45.4513362],
          [-111.2354644, 45.450261],
          [-111.2351786, 45.4495685],
          [-111.2352306, 45.4491494],
          [-111.235309, 45.4484572],
          [-111.2351012, 45.4479105],
          [-111.2343739, 45.4472362],
          [-111.2332569, 45.4461974],
          [-111.2323997, 45.4452862],
          [-111.2314385, 45.4445207],
          [-111.2306592, 45.4436824],
          [-111.229854, 45.4426253],
          [-111.2291266, 45.4420421],
          [-111.2290487, 45.4417322],
          [-111.2291526, 45.4414224],
          [-111.2295423, 45.4411125],
          [-111.2305901, 45.4404878],
          [-111.2316175, 45.4399111],
          [-111.2322633, 45.4390048],
          [-111.2327036, 45.4378102],
          [-111.2326742, 45.4369656],
          [-111.232322, 45.4361211],
          [-111.2321165, 45.4354208],
          [-111.2325568, 45.4346998],
          [-111.2330558, 45.4338347],
          [-111.2330265, 45.4328665],
          [-111.2329678, 45.4316718],
          [-111.232821, 45.4305594],
          [-111.2319018, 45.4295803],
          [-111.232509, 45.4280889],
          [-111.2332174, 45.4258161],
          [-111.2337233, 45.4234012],
          [-111.2335209, 45.4219806],
          [-111.2331162, 45.4194235],
          [-111.232509, 45.4172214],
          [-111.2321042, 45.4157296],
          [-111.2310922, 45.4148061],
          [-111.2303838, 45.4143089],
          [-111.2292706, 45.4137405],
          [-111.2283598, 45.4130301],
          [-111.2270442, 45.4108278],
          [-111.2267406, 45.4086965],
          [-111.2262346, 45.4076307],
          [-111.2256274, 45.4071334],
          [-111.2250202, 45.406565],
          [-111.2232998, 45.4068492],
          [-111.222895, 45.4069203],
          [-111.2221866, 45.4070624],
          [-111.2212758, 45.4067071],
          [-111.2204662, 45.4057124],
          [-111.2197578, 45.4045756],
          [-111.2185434, 45.4034387],
          [-111.2184422, 45.4010836],
          [-111.2166321, 45.3999282],
          [-111.2149866, 45.3986572],
          [-111.2128475, 45.3979639],
          [-111.2092273, 45.3957686],
          [-111.2070882, 45.3951908],
          [-111.2039617, 45.3907998],
          [-111.1998479, 45.3899908],
          [-111.1982024, 45.3896442],
          [-111.1962278, 45.3869862],
          [-111.1942532, 45.3855994],
          [-111.1934304, 45.3816699],
          [-111.1824055, 45.3801673],
          [-111.1753298, 45.3794739]
        ]
      }
    ]
  }
];

export default rivers;
