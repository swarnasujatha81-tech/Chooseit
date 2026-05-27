import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outStops = path.join(root, 'src', 'data', 'busStops.json');
const outRoutes = path.join(root, 'src', 'data', 'routes.json');

const hubs = new Set([
  'Secunderabad', 'Koti', 'Ameerpet', 'Mehdipatnam', 'ECIL', 'Uppal',
  'LB Nagar', 'Kukatpally', 'Hitech City', 'Charminar', 'Dilsukhnagar',
  'Miyapur', 'KPHB', 'JNTU', 'Paradise', 'MGBS', 'Jubilee Bus Station',
  'Gachibowli', 'Patancheru', 'Lingampally', 'BHEL', 'Raidurg',
  'Shamshabad', 'Airport', 'Hayathnagar',
]);

const anchors = [
  ['Miyapur', 17.4964, 78.3339, 'Miyapur'],
  ['Miyapur X Roads', 17.4982, 78.3368, 'Miyapur'],
  ['Miyapur Metro Station', 17.4961, 78.3318, 'Miyapur'],
  ['Allwyn X Roads', 17.4946, 78.3485, 'Miyapur'],
  ['Madinaguda', 17.4932, 78.3426, 'Madinaguda'],
  ['Deepthisri Nagar', 17.4925, 78.3517, 'Madinaguda'],
  ['Nizampet', 17.5184, 78.3826, 'Nizampet'],
  ['Bachupally', 17.5447, 78.3545, 'Bachupally'],
  ['Pragathi Nagar', 17.5189, 78.3982, 'Pragathi Nagar'],
  ['Hafeezpet', 17.4848, 78.3581, 'Hafeezpet'],
  ['Chandanagar', 17.4930, 78.3257, 'Chandanagar'],
  ['Lingampally', 17.4876, 78.3354, 'Lingampally'],
  ['BHEL', 17.4938, 78.2983, 'BHEL'],
  ['RC Puram', 17.5196, 78.3071, 'Ramachandrapuram'],
  ['Patancheru', 17.5333, 78.2645, 'Patancheru'],
  ['Isnapur', 17.5446, 78.2186, 'Patancheru'],
  ['Beeramguda', 17.5183, 78.2987, 'Beeramguda'],
  ['Ashok Nagar BHEL', 17.5017, 78.3001, 'BHEL'],
  ['JNTU', 17.4937, 78.3934, 'Kukatpally'],
  ['KPHB', 17.4931, 78.3915, 'KPHB Colony'],
  ['KPHB 6th Phase', 17.4886, 78.3883, 'KPHB Colony'],
  ['Kukatpally', 17.4948, 78.3996, 'Kukatpally'],
  ['Kukatpally Y Junction', 17.4866, 78.4136, 'Kukatpally'],
  ['Moosapet', 17.4691, 78.4257, 'Moosapet'],
  ['Balanagar', 17.4765, 78.4483, 'Balanagar'],
  ['Fatehnagar', 17.4573, 78.4463, 'Fatehnagar'],
  ['Bharat Nagar', 17.4558, 78.4309, 'Bharat Nagar'],
  ['Erragadda', 17.4565, 78.4332, 'Erragadda'],
  ['ESI Hospital', 17.4448, 78.4418, 'Sanath Nagar'],
  ['SR Nagar', 17.4437, 78.4481, 'SR Nagar'],
  ['Ameerpet', 17.4375, 78.4483, 'Ameerpet'],
  ['Mytrivanam', 17.4359, 78.4459, 'Ameerpet'],
  ['Punjagutta', 17.4265, 78.4518, 'Punjagutta'],
  ['Somajiguda', 17.4231, 78.4586, 'Somajiguda'],
  ['Khairatabad', 17.4118, 78.4622, 'Khairatabad'],
  ['Lakdikapul', 17.4030, 78.4659, 'Lakdikapul'],
  ['Assembly', 17.3978, 78.4723, 'Nampally'],
  ['Nampally', 17.3897, 78.4756, 'Nampally'],
  ['Abids', 17.3891, 78.4779, 'Abids'],
  ['Koti', 17.3850, 78.4867, 'Koti'],
  ['Sultan Bazar', 17.3854, 78.4832, 'Koti'],
  ['Chaderghat', 17.3746, 78.4917, 'Chaderghat'],
  ['Malakpet', 17.3734, 78.5042, 'Malakpet'],
  ['Moosarambagh', 17.3715, 78.5111, 'Moosarambagh'],
  ['Dilsukhnagar', 17.3687, 78.5265, 'Dilsukhnagar'],
  ['Chaitanyapuri', 17.3660, 78.5330, 'Chaitanyapuri'],
  ['Kothapet', 17.3683, 78.5455, 'Kothapet'],
  ['LB Nagar', 17.3469, 78.5526, 'LB Nagar'],
  ['Saroornagar', 17.3566, 78.5337, 'Saroornagar'],
  ['Vanasthalipuram', 17.3276, 78.5750, 'Vanasthalipuram'],
  ['Hayathnagar', 17.3271, 78.6022, 'Hayathnagar'],
  ['Auto Nagar', 17.3455, 78.5676, 'Auto Nagar'],
  ['Nagole', 17.3863, 78.5648, 'Nagole'],
  ['Uppal', 17.4014, 78.5597, 'Uppal'],
  ['Uppal Depot', 17.3986, 78.5616, 'Uppal'],
  ['Habsiguda', 17.4172, 78.5535, 'Habsiguda'],
  ['Tarnaka', 17.4276, 78.5381, 'Tarnaka'],
  ['Mettuguda', 17.4352, 78.5259, 'Mettuguda'],
  ['Secunderabad', 17.4399, 78.4983, 'Secunderabad'],
  ['Jubilee Bus Station', 17.4445, 78.4990, 'Secunderabad'],
  ['Paradise', 17.4417, 78.4873, 'Paradise'],
  ['Rasoolpura', 17.4430, 78.4808, 'Begumpet'],
  ['Begumpet', 17.4440, 78.4666, 'Begumpet'],
  ['Prakash Nagar', 17.4442, 78.4612, 'Begumpet'],
  ['Bowenpally', 17.4643, 78.4761, 'Bowenpally'],
  ['Suchitra', 17.4987, 78.4768, 'Suchitra'],
  ['Kompally', 17.5436, 78.4899, 'Kompally'],
  ['Medchal', 17.6319, 78.4814, 'Medchal'],
  ['Jeedimetla', 17.5107, 78.4590, 'Jeedimetla'],
  ['Shapur Nagar', 17.5147, 78.4472, 'Shapur Nagar'],
  ['Suraram', 17.5411, 78.4364, 'Suraram'],
  ['Quthbullapur', 17.5013, 78.4580, 'Quthbullapur'],
  ['Tirumalagiri', 17.4725, 78.5165, 'Tirumalagiri'],
  ['Alwal', 17.5048, 78.5036, 'Alwal'],
  ['Bolarum', 17.5184, 78.5126, 'Bolarum'],
  ['Lothkunta', 17.4919, 78.5206, 'Lothkunta'],
  ['Malkajgiri', 17.4474, 78.5361, 'Malkajgiri'],
  ['Safilguda', 17.4661, 78.5356, 'Safilguda'],
  ['Neredmet', 17.4829, 78.5373, 'Neredmet'],
  ['Sainikpuri', 17.4931, 78.5496, 'Sainikpuri'],
  ['AS Rao Nagar', 17.4803, 78.5593, 'AS Rao Nagar'],
  ['ECIL', 17.4738, 78.5718, 'ECIL'],
  ['Kushaiguda', 17.4665, 78.5820, 'Kushaiguda'],
  ['Cherlapally', 17.4701, 78.5960, 'Cherlapally'],
  ['Nacharam', 17.4292, 78.5584, 'Nacharam'],
  ['Mallapur', 17.4404, 78.5787, 'Mallapur'],
  ['Boduppal', 17.4148, 78.5882, 'Boduppal'],
  ['Peerzadiguda', 17.3975, 78.6010, 'Peerzadiguda'],
  ['Medipally', 17.4058, 78.6107, 'Medipally'],
  ['Ghatkesar', 17.4492, 78.6850, 'Ghatkesar'],
  ['Ramanthapur', 17.3912, 78.5376, 'Ramanthapur'],
  ['Amberpet', 17.3898, 78.5182, 'Amberpet'],
  ['Osmania University', 17.4145, 78.5281, 'OU Campus'],
  ['Vidyanagar', 17.4022, 78.5138, 'Vidyanagar'],
  ['RTC X Roads', 17.4072, 78.4966, 'RTC X Roads'],
  ['Musheerabad', 17.4166, 78.4983, 'Musheerabad'],
  ['Gandhi Hospital', 17.4245, 78.5040, 'Musheerabad'],
  ['Tank Bund', 17.4208, 78.4738, 'Tank Bund'],
  ['Liberty', 17.4059, 78.4766, 'Liberty'],
  ['Himayatnagar', 17.4014, 78.4846, 'Himayatnagar'],
  ['Narayanaguda', 17.3954, 78.4890, 'Narayanaguda'],
  ['Kachiguda', 17.3893, 78.4992, 'Kachiguda'],
  ['MGBS', 17.3793, 78.4837, 'Imlibun'],
  ['Imlibun', 17.3788, 78.4850, 'Imlibun'],
  ['Afzalgunj', 17.3753, 78.4744, 'Afzalgunj'],
  ['Osmania Hospital', 17.3710, 78.4756, 'Afzalgunj'],
  ['Charminar', 17.3616, 78.4747, 'Old City'],
  ['Madina', 17.3689, 78.4742, 'Old City'],
  ['Pathergatti', 17.3656, 78.4765, 'Old City'],
  ['Shah Ali Banda', 17.3537, 78.4728, 'Old City'],
  ['Falaknuma', 17.3317, 78.4678, 'Falaknuma'],
  ['Chandrayangutta', 17.3053, 78.4774, 'Chandrayangutta'],
  ['Santosh Nagar', 17.3470, 78.5086, 'Santosh Nagar'],
  ['Saidabad', 17.3582, 78.5149, 'Saidabad'],
  ['IS Sadan', 17.3485, 78.5178, 'Saidabad'],
  ['Aramghar', 17.3203, 78.4431, 'Aramghar'],
  ['Attapur', 17.3670, 78.4306, 'Attapur'],
  ['Rajendranagar', 17.3200, 78.4021, 'Rajendranagar'],
  ['Shamshabad', 17.2603, 78.3969, 'Shamshabad'],
  ['Airport', 17.2403, 78.4294, 'RGIA'],
  ['Gaganpahad', 17.3048, 78.4225, 'Gaganpahad'],
  ['Mehdipatnam', 17.3916, 78.4330, 'Mehdipatnam'],
  ['Masab Tank', 17.4007, 78.4497, 'Masab Tank'],
  ['NMDC', 17.3957, 78.4439, 'Masab Tank'],
  ['Tolichowki', 17.3984, 78.4115, 'Tolichowki'],
  ['Salarjung Colony', 17.4001, 78.4218, 'Tolichowki'],
  ['Langar Houz', 17.3827, 78.4125, 'Langar Houz'],
  ['Golconda', 17.3833, 78.4011, 'Golconda'],
  ['Shaikpet', 17.4099, 78.3925, 'Shaikpet'],
  ['OU Colony Shaikpet', 17.4075, 78.3879, 'Shaikpet'],
  ['Raidurg', 17.4435, 78.3772, 'Raidurg'],
  ['Mindspace', 17.4413, 78.3815, 'Madhapur'],
  ['Hitech City', 17.4483, 78.3915, 'Hitech City'],
  ['HITEC City', 17.4494, 78.3866, 'Hitech City'],
  ['Hi Tech City', 17.4476, 78.3902, 'Hitech City'],
  ['Madhapur', 17.4486, 78.3908, 'Madhapur'],
  ['Image Gardens', 17.4472, 78.3835, 'Madhapur'],
  ['Kondapur', 17.4630, 78.3670, 'Kondapur'],
  ['Kothaguda', 17.4597, 78.3681, 'Kothaguda'],
  ['Botanical Garden', 17.4564, 78.3639, 'Kondapur'],
  ['Gachibowli', 17.4401, 78.3489, 'Gachibowli'],
  ['Indira Nagar Gachibowli', 17.4451, 78.3534, 'Gachibowli'],
  ['Nanakramguda', 17.4168, 78.3427, 'Nanakramguda'],
  ['Financial District', 17.4138, 78.3428, 'Financial District'],
  ['Waverock', 17.4266, 78.3314, 'Financial District'],
  ['Kokapet', 17.3943, 78.3354, 'Kokapet'],
  ['Narsingi', 17.3853, 78.3578, 'Narsingi'],
  ['Manikonda', 17.4050, 78.3761, 'Manikonda'],
  ['Puppalaguda', 17.4037, 78.3896, 'Puppalaguda'],
  ['Jubilee Hills Check Post', 17.4307, 78.4126, 'Jubilee Hills'],
  ['Jubilee Hills Road 36', 17.4310, 78.4087, 'Jubilee Hills'],
  ['Peddamma Temple', 17.4309, 78.4070, 'Jubilee Hills'],
  ['Film Nagar', 17.4249, 78.4010, 'Film Nagar'],
  ['Banjara Hills', 17.4156, 78.4347, 'Banjara Hills'],
  ['Banjara Hills Road 12', 17.4134, 78.4261, 'Banjara Hills'],
  ['Care Hospital', 17.4128, 78.4503, 'Banjara Hills'],
  ['Yousufguda', 17.4361, 78.4271, 'Yousufguda'],
  ['Madhura Nagar', 17.4381, 78.4396, 'Madhura Nagar'],
  ['Krishna Nagar', 17.4341, 78.4244, 'Krishna Nagar'],
  ['Srinagar Colony', 17.4297, 78.4386, 'Srinagar Colony'],
  ['Karkhana', 17.4582, 78.5016, 'Karkhana'],
  ['Marredpally', 17.4482, 78.5155, 'Marredpally'],
  ['West Marredpally', 17.4497, 78.5056, 'Marredpally'],
  ['Trimulgherry', 17.4741, 78.5169, 'Trimulgherry'],
  ['Hasmathpet', 17.4690, 78.4665, 'Hasmathpet'],
  ['Old Bowenpally', 17.4684, 78.4840, 'Bowenpally'],
  ['Picket', 17.4526, 78.5010, 'Secunderabad'],
  ['Clock Tower Secunderabad', 17.4395, 78.4965, 'Secunderabad'],
];

const corridorRoutes = [
  ['10H', 'Miyapur → Secunderabad', ['Miyapur', 'JNTU', 'KPHB', 'Kukatpally', 'Moosapet', 'Erragadda', 'SR Nagar', 'Ameerpet', 'Begumpet', 'Paradise', 'Secunderabad']],
  ['10K', 'Kukatpally → Secunderabad', ['Kukatpally', 'Moosapet', 'Bharat Nagar', 'Erragadda', 'Ameerpet', 'Begumpet', 'Paradise', 'Secunderabad']],
  ['10Y', 'Miyapur → Koti', ['Miyapur', 'JNTU', 'KPHB', 'Kukatpally', 'Moosapet', 'Ameerpet', 'Punjagutta', 'Lakdikapul', 'Koti']],
  ['16A', 'Secunderabad → ECIL', ['Secunderabad', 'Tarnaka', 'Habsiguda', 'Uppal', 'Nagole', 'AS Rao Nagar', 'ECIL']],
  ['16C', 'Secunderabad → ECIL via Malkajgiri', ['Secunderabad', 'Jubilee Bus Station', 'Malkajgiri', 'Neredmet', 'AS Rao Nagar', 'ECIL']],
  ['17H', 'Uppal → Mehdipatnam', ['Uppal', 'Habsiguda', 'Tarnaka', 'Secunderabad', 'Paradise', 'Begumpet', 'Ameerpet', 'Punjagutta', 'Mehdipatnam']],
  ['17D', 'Dilsukhnagar → Uppal', ['Dilsukhnagar', 'Malakpet', 'Koti', 'RTC X Roads', 'Secunderabad', 'Tarnaka', 'Habsiguda', 'Uppal']],
  ['18R', 'Uppal → Afzalgunj', ['Uppal', 'Ramanthapur', 'Amberpet', 'Vidyanagar', 'RTC X Roads', 'Koti', 'Afzalgunj']],
  ['24S', 'Secunderabad → Bolarum', ['Secunderabad', 'Jubilee Bus Station', 'Tirumalagiri', 'Alwal', 'Bolarum']],
  ['25S', 'Suchitra → Chandrayangutta', ['Suchitra', 'Bowenpally', 'Paradise', 'Secunderabad', 'RTC X Roads', 'Koti', 'Afzalgunj', 'Charminar', 'Chandrayangutta']],
  ['27E', 'JBS → ECIL', ['Jubilee Bus Station', 'Secunderabad', 'Tarnaka', 'Habsiguda', 'Uppal', 'AS Rao Nagar', 'ECIL']],
  ['29B', 'Secunderabad → Kompally', ['Secunderabad', 'Paradise', 'Bowenpally', 'Suchitra', 'Kompally']],
  ['31H', 'JNTU → Secunderabad', ['JNTU', 'KPHB', 'Kukatpally', 'Moosapet', 'Ameerpet', 'Begumpet', 'Paradise', 'Secunderabad']],
  ['38X', 'Secunderabad → AS Rao Nagar', ['Secunderabad', 'Malkajgiri', 'Neredmet', 'Sainikpuri', 'AS Rao Nagar']],
  ['47L', 'Secunderabad → Nampally', ['Secunderabad', 'Paradise', 'Begumpet', 'Ameerpet', 'Punjagutta', 'Lakdikapul', 'Nampally']],
  ['49', 'Secunderabad → Afzalgunj', ['Secunderabad', 'RTC X Roads', 'Koti', 'Afzalgunj']],
  ['65', 'Charminar → Mehdipatnam', ['Charminar', 'Afzalgunj', 'MGBS', 'Nampally', 'Lakdikapul', 'Masab Tank', 'Mehdipatnam']],
  ['72J', 'Koti → LB Nagar', ['Koti', 'Chaderghat', 'Malakpet', 'Dilsukhnagar', 'Kothapet', 'LB Nagar']],
  ['83J', 'Kachiguda → Secunderabad', ['Kachiguda', 'Narayanaguda', 'Himayatnagar', 'Liberty', 'Tank Bund', 'Secunderabad']],
  ['90L', 'LB Nagar → Secunderabad', ['LB Nagar', 'Kothapet', 'Dilsukhnagar', 'Malakpet', 'Koti', 'RTC X Roads', 'Secunderabad']],
  ['90U', 'LB Nagar → Secunderabad via Uppal', ['LB Nagar', 'Nagole', 'Uppal', 'Habsiguda', 'Tarnaka', 'Secunderabad']],
  ['100M', 'Miyapur → Koti', ['Miyapur', 'JNTU', 'KPHB', 'Kukatpally', 'Ameerpet', 'Punjagutta', 'Lakdikapul', 'Nampally', 'Koti']],
  ['113M', 'Uppal → Lingampally', ['Uppal', 'Habsiguda', 'Tarnaka', 'Secunderabad', 'Paradise', 'Begumpet', 'Ameerpet', 'Kukatpally', 'Miyapur', 'Lingampally']],
  ['119M', 'Mehdipatnam → Kondapur', ['Mehdipatnam', 'Tolichowki', 'Shaikpet', 'Raidurg', 'Hitech City', 'Kondapur']],
  ['120K', 'Koti → Kondapur', ['Koti', 'Lakdikapul', 'Masab Tank', 'Mehdipatnam', 'Tolichowki', 'Gachibowli', 'Kondapur']],
  ['126M', 'Mehdipatnam → Kukatpally', ['Mehdipatnam', 'Masab Tank', 'Lakdikapul', 'Punjagutta', 'Ameerpet', 'SR Nagar', 'Erragadda', 'Kukatpally']],
  ['127K', 'Koti → Kondapur', ['Koti', 'Abids', 'Lakdikapul', 'Punjagutta', 'Ameerpet', 'Jubilee Hills Check Post', 'Madhapur', 'Hitech City', 'Kondapur']],
  ['156H', 'Hayathnagar → Afzalgunj', ['Hayathnagar', 'LB Nagar', 'Kothapet', 'Dilsukhnagar', 'Malakpet', 'Koti', 'Afzalgunj']],
  ['171K', 'Ghatkesar → Secunderabad', ['Ghatkesar', 'Medipally', 'Peerzadiguda', 'Boduppal', 'Uppal', 'Habsiguda', 'Tarnaka', 'Secunderabad']],
  ['187D', 'Dilsukhnagar → Golconda', ['Dilsukhnagar', 'Koti', 'Lakdikapul', 'Masab Tank', 'Mehdipatnam', 'Langar Houz', 'Golconda']],
  ['188K', 'Kukatpally → Patancheru', ['Kukatpally', 'KPHB', 'JNTU', 'Miyapur', 'Chandanagar', 'Lingampally', 'BHEL', 'Patancheru']],
  ['195W', 'Waverock → Kukatpally', ['Waverock', 'Financial District', 'Gachibowli', 'Raidurg', 'Hitech City', 'Madhapur', 'Kukatpally']],
  ['216', 'Secunderabad → Patancheru', ['Secunderabad', 'Paradise', 'Begumpet', 'Ameerpet', 'Kukatpally', 'Miyapur', 'Chandanagar', 'Lingampally', 'BHEL', 'Patancheru']],
  ['217', 'Koti → Patancheru', ['Koti', 'Lakdikapul', 'Ameerpet', 'Kukatpally', 'Miyapur', 'BHEL', 'Patancheru']],
  ['218D', 'Dilsukhnagar → Patancheru', ['Dilsukhnagar', 'Koti', 'Lakdikapul', 'Ameerpet', 'Kukatpally', 'Miyapur', 'Lingampally', 'Patancheru']],
  ['219', 'Secunderabad → Patancheru', ['Secunderabad', 'Paradise', 'Begumpet', 'Ameerpet', 'Kukatpally', 'JNTU', 'Miyapur', 'Patancheru']],
  ['222A', 'Patancheru → Charminar', ['Patancheru', 'BHEL', 'Lingampally', 'Miyapur', 'KPHB', 'Kukatpally', 'Ameerpet', 'Lakdikapul', 'Afzalgunj', 'Charminar']],
  ['225D', 'Secunderabad → Bachupally', ['Secunderabad', 'Paradise', 'Bowenpally', 'Suchitra', 'Jeedimetla', 'Shapur Nagar', 'Bachupally']],
  ['229', 'Secunderabad → Medchal', ['Secunderabad', 'Jubilee Bus Station', 'Tirumalagiri', 'Alwal', 'Kompally', 'Medchal']],
  ['250C', 'Secunderabad → Ghatkesar', ['Secunderabad', 'Tarnaka', 'Habsiguda', 'Uppal', 'Peerzadiguda', 'Ghatkesar']],
  ['251M', 'MGBS → Shamshabad', ['MGBS', 'Afzalgunj', 'Charminar', 'Chandrayangutta', 'Aramghar', 'Shamshabad']],
  ['252S', 'Koti → Shamshabad', ['Koti', 'Afzalgunj', 'Charminar', 'Falaknuma', 'Chandrayangutta', 'Shamshabad']],
  ['277D', 'Dilsukhnagar → Hayathnagar', ['Dilsukhnagar', 'LB Nagar', 'Vanasthalipuram', 'Hayathnagar']],
  ['288D', 'Mehdipatnam → Shamshabad', ['Mehdipatnam', 'Attapur', 'Aramghar', 'Rajendranagar', 'Shamshabad']],
  ['300', 'Uppal → Mehdipatnam', ['Uppal', 'Nagole', 'LB Nagar', 'Dilsukhnagar', 'Koti', 'Lakdikapul', 'Mehdipatnam']],
  ['445M', 'Mehdipatnam → Kokapet', ['Mehdipatnam', 'Tolichowki', 'Gachibowli', 'Financial District', 'Nanakramguda', 'Kokapet']],
  ['470', 'Koti → Financial District', ['Koti', 'Lakdikapul', 'Ameerpet', 'Hitech City', 'Gachibowli', 'Financial District']],
  ['505', 'Secunderabad → Gachibowli', ['Secunderabad', 'Paradise', 'Ameerpet', 'Jubilee Hills Check Post', 'Raidurg', 'Gachibowli']],
];

const feederCorridors = [
  ['Miyapur', 'Miyapur X Roads', 'Miyapur Metro Station', 'Allwyn X Roads', 'Madinaguda', 'Deepthisri Nagar', 'Hafeezpet', 'Kondapur'],
  ['KPHB', 'KPHB 6th Phase', 'JNTU', 'Kukatpally', 'Kukatpally Y Junction', 'Moosapet', 'Balanagar', 'Fatehnagar'],
  ['Secunderabad', 'Clock Tower Secunderabad', 'Picket', 'Karkhana', 'Tirumalagiri', 'Lothkunta', 'Alwal', 'Bolarum'],
  ['ECIL', 'Kushaiguda', 'Cherlapally', 'Mallapur', 'Nacharam', 'Habsiguda', 'Tarnaka', 'Secunderabad'],
  ['Koti', 'Sultan Bazar', 'Chaderghat', 'Malakpet', 'Moosarambagh', 'Dilsukhnagar', 'Chaitanyapuri', 'Kothapet', 'LB Nagar'],
  ['Charminar', 'Pathergatti', 'Madina', 'Afzalgunj', 'MGBS', 'Nampally', 'Lakdikapul', 'Masab Tank', 'Mehdipatnam'],
  ['Mehdipatnam', 'Tolichowki', 'Salarjung Colony', 'Shaikpet', 'OU Colony Shaikpet', 'Raidurg', 'Mindspace', 'Hitech City'],
  ['Hitech City', 'Madhapur', 'Image Gardens', 'Kothaguda', 'Botanical Garden', 'Kondapur', 'Gachibowli', 'Financial District'],
  ['Gachibowli', 'Indira Nagar Gachibowli', 'Nanakramguda', 'Waverock', 'Financial District', 'Kokapet', 'Narsingi', 'Manikonda'],
  ['Jubilee Hills Check Post', 'Peddamma Temple', 'Jubilee Hills Road 36', 'Film Nagar', 'Banjara Hills Road 12', 'Banjara Hills', 'Care Hospital', 'Punjagutta'],
  ['LB Nagar', 'Auto Nagar', 'Vanasthalipuram', 'Hayathnagar'],
  ['Uppal', 'Boduppal', 'Peerzadiguda', 'Medipally', 'Ghatkesar'],
  ['Paradise', 'Bowenpally', 'Suchitra', 'Quthbullapur', 'Jeedimetla', 'Shapur Nagar', 'Suraram'],
  ['Patancheru', 'Isnapur', 'Beeramguda', 'RC Puram', 'BHEL', 'Lingampally', 'Chandanagar', 'Miyapur'],
  ['Koti', 'Himayatnagar', 'Narayanaguda', 'Kachiguda', 'Vidyanagar', 'Osmania University', 'Tarnaka'],
  ['Secunderabad', 'Gandhi Hospital', 'Musheerabad', 'RTC X Roads', 'Himayatnagar', 'Liberty', 'Abids', 'Koti'],
  ['MGBS', 'Aramghar', 'Gaganpahad', 'Shamshabad', 'Airport'],
  ['Mehdipatnam', 'Attapur', 'Aramghar', 'Rajendranagar', 'Shamshabad', 'Airport'],
];

const slug = (value) => value
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const variantsFor = (name, lat, lng) => {
  const suffixes = [
    ['Local Stop', 0.00045, 0.00035],
    ['Main Road', -0.00042, 0.00028],
  ];
  if (hubs.has(name)) suffixes.push(['Interchange', 0.00028, -0.00042]);
  return suffixes.map(([suffix, dLat, dLng]) => [`${name} ${suffix}`, lat + dLat, lng + dLng]);
};

const stopMap = new Map();
const addStop = (name, lat, lng, area, importance = 5, is_interchange = false) => {
  if (stopMap.has(name)) return;
  stopMap.set(name, {
    id: `stop_${slug(name)}`,
    name,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    area,
    is_interchange,
    importance,
  });
};

for (const [name, lat, lng, area] of anchors) {
  const hub = hubs.has(name);
  addStop(name, lat, lng, area, hub ? 10 : 6, hub);
  for (const [variant, vLat, vLng] of variantsFor(name, lat, lng)) {
    addStop(variant, vLat, vLng, area, hub ? 8 : 4, false);
  }
}

const routeMap = new Map();
const speedFor = (stops) => {
  if (stops.some((stop) => ['Airport', 'Shamshabad', 'Patancheru', 'Medchal', 'Ghatkesar'].includes(stop))) return 28;
  if (stops.some((stop) => ['Koti', 'Charminar', 'Secunderabad', 'Ameerpet'].includes(stop))) return 20;
  return 22;
};
const waitFor = (routeNo) => (String(routeNo).includes('A') || String(routeNo).includes('H') ? 7 : 9);
const addRoute = (route_no, direction, stops, service_type = 'city') => {
  const cleanStops = stops.filter((stop, index) => index === 0 || stop !== stops[index - 1]);
  if (cleanStops.length < 2 || routeMap.has(route_no)) return;
  routeMap.set(route_no, {
    route_no,
    direction,
    avg_speed_kmph: speedFor(cleanStops),
    avg_wait_min: waitFor(route_no),
    service_type,
    stops: cleanStops,
  });
};

for (const [routeNo, direction, stops] of corridorRoutes) addRoute(routeNo, direction, stops);

let generated = 1;
for (const corridor of feederCorridors) {
  addRoute(`F${String(generated).padStart(3, '0')}`, `${corridor[0]} → ${corridor.at(-1)}`, corridor, 'feeder');
  generated += 1;
  addRoute(`F${String(generated).padStart(3, '0')}`, `${corridor.at(-1)} → ${corridor[0]}`, [...corridor].reverse(), 'feeder');
  generated += 1;
}

const hubsList = ['Secunderabad', 'Koti', 'Ameerpet', 'Mehdipatnam', 'Uppal', 'LB Nagar', 'Miyapur', 'Kukatpally', 'Hitech City', 'Charminar', 'Dilsukhnagar', 'ECIL'];
for (const [name] of anchors) {
  for (const suffix of ['Local Stop', 'Main Road', 'Interchange']) {
    const variant = `${name} ${suffix}`;
    if (!stopMap.has(variant)) continue;
    const nearestHub = hubsList
      .map((hub) => {
        const a = stopMap.get(name);
        const b = stopMap.get(hub);
        return { hub, d: Math.hypot(a.lat - b.lat, a.lng - b.lng) };
      })
      .sort((a, b) => a.d - b.d)[0].hub;
    addRoute(`S${String(generated).padStart(3, '0')}`, `${variant} → ${nearestHub}`, [variant, name, nearestHub], 'local');
    generated += 1;
  }
}

const orbitalPairs = [
  ['Miyapur', 'Kukatpally', 'Ameerpet', 'Secunderabad', 'Tarnaka', 'Uppal', 'LB Nagar'],
  ['Patancheru', 'BHEL', 'Lingampally', 'Miyapur', 'KPHB', 'Ameerpet', 'Koti', 'Dilsukhnagar'],
  ['Gachibowli', 'Hitech City', 'Jubilee Hills Check Post', 'Ameerpet', 'Secunderabad', 'ECIL'],
  ['Mehdipatnam', 'Lakdikapul', 'Koti', 'Dilsukhnagar', 'LB Nagar', 'Hayathnagar'],
  ['Charminar', 'MGBS', 'Koti', 'RTC X Roads', 'Secunderabad', 'Paradise', 'Suchitra', 'Kompally'],
  ['Airport', 'Shamshabad', 'Aramghar', 'Mehdipatnam', 'Lakdikapul', 'Secunderabad'],
  ['Airport', 'Shamshabad', 'Aramghar', 'MGBS', 'Koti', 'Secunderabad'],
  ['Kokapet', 'Financial District', 'Gachibowli', 'Raidurg', 'Hitech City', 'Kukatpally', 'Miyapur'],
  ['Alwal', 'Tirumalagiri', 'Secunderabad', 'Koti', 'Charminar', 'Chandrayangutta'],
  ['Bachupally', 'Nizampet', 'JNTU', 'KPHB', 'Kukatpally', 'Ameerpet', 'Mehdipatnam'],
];
let orbitalNo = 700;
for (const route of orbitalPairs) {
  addRoute(String(orbitalNo), `${route[0]} → ${route.at(-1)}`, route);
  orbitalNo += 1;
  addRoute(`${orbitalNo}R`, `${route.at(-1)} → ${route[0]}`, [...route].reverse());
  orbitalNo += 1;
}

const stops = [...stopMap.values()].sort((a, b) => a.name.localeCompare(b.name));
const routes = [...routeMap.values()].sort((a, b) => a.route_no.localeCompare(b.route_no, undefined, { numeric: true }));

const stopNames = new Set(stops.map((stop) => stop.name));
const ids = new Set();
for (const stop of stops) {
  if (ids.has(stop.id)) throw new Error(`Duplicate stop id ${stop.id}`);
  ids.add(stop.id);
}
for (const route of routes) {
  for (const stop of route.stops) {
    if (!stopNames.has(stop)) throw new Error(`Route ${route.route_no} references missing stop ${stop}`);
  }
}

fs.writeFileSync(outStops, `${JSON.stringify(stops, null, 2)}\n`);
fs.writeFileSync(outRoutes, `${JSON.stringify(routes, null, 2)}\n`);

console.log(`Generated ${stops.length} stops and ${routes.length} routes.`);
