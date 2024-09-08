import { KDefaultPreviewGlyphFillColor } from '@/lib/consts';

export default function NP1_15_Preview({ zoneColors }: { zoneColors: string[] }) {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[300px] w-[150px]"
      viewBox="-5 -20 500 1000"
    >
      <path
        fill={zoneColors[0] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M91.067368,224.289093 
      C117.395096,229.149200 139.230606,211.457901 139.790436,185.170456 
      C139.953568,177.510757 139.949326,169.841980 139.774429,162.182999 
      C139.688217,158.407578 140.877289,156.826340 144.906799,156.822800 
      C154.947098,156.813965 155.070648,156.650513 154.915649,166.814987 
      C154.723648,179.407379 156.055145,192.069458 151.538849,204.379654 
      C142.570480,228.824982 116.973541,244.024292 91.106552,239.828705 
      C65.800629,235.724121 45.561996,213.472153 45.170555,188.026596 
      C44.691456,156.882446 44.676010,125.718918 45.180954,94.575455 
      C45.642212,66.126221 69.553543,42.632877 97.701851,41.910316 
      C127.410309,41.147705 151.925827,62.580441 154.675888,91.600342 
      C155.032501,95.363365 153.575089,96.900543 149.961456,96.786850 
      C148.796524,96.750198 147.604202,96.627159 146.467590,96.810844 
      C141.142624,97.671356 139.705521,94.857933 139.026672,90.111107 
      C136.763138,74.283722 124.357323,61.320663 108.785568,57.952122 
      C84.206718,52.635124 60.851330,70.078880 60.324463,95.244194 
      C59.683006,125.882416 59.837730,156.549545 60.306553,187.194107 
      C60.582092,205.204697 72.981079,219.540451 91.067368,224.289093 
  z"
      />
      <path
        fill={zoneColors[1] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M329.781372,181.877289 
      C327.855804,183.440857 326.101135,185.858978 324.493896,185.764679 
      C321.681610,185.599655 318.200287,184.607010 316.373260,182.667114 
      C313.427734,179.539597 315.044220,175.895020 317.630615,172.820602 
      C329.634369,158.551941 341.603973,144.254532 353.589539,129.970581 
      C368.357788,112.370323 383.129791,94.773224 397.899689,77.174332 
      C398.113678,76.919334 398.317902,76.656090 398.532166,76.401337 
      C402.648560,71.507889 407.271698,70.472923 410.908997,73.629623 
      C414.457825,76.709557 414.266083,81.195297 410.286041,85.952339 
      C400.243652,97.955353 390.170288,109.932442 380.109222,121.919846 
      C363.412415,141.813477 346.715485,161.707016 329.781372,181.877289 
  z"
      />

      {/* Main big back light ZONES */}

      <path
        fill={zoneColors[4] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M426.087311,338.975616 
      C429.093750,344.327240 428.820587,347.892365 425.450073,350.345795 
      C422.030182,352.835175 418.594666,352.045441 414.469727,348.016205 
      C401.628387,335.472778 389.664917,321.820343 375.700958,310.678467 
      C342.261169,283.996765 303.761719,268.126709 261.108002,264.259003 
      C242.671982,262.587311 223.922913,264.225830 205.321701,264.624176 
      C201.025696,264.716187 197.235413,264.643280 195.250443,260.167450 
      C193.219360,255.587646 195.971710,250.810440 201.682297,250.184174 
      C212.919083,248.951843 224.218063,247.533798 235.491318,247.533905 
      C264.534393,247.534164 292.842163,252.409698 320.115143,262.621124 
      C349.442017,273.601624 376.044342,289.211975 398.958252,310.625854 
      C408.413818,319.462463 416.931305,329.302887 426.087311,338.975616 
  z"
      />

      <path
        fill={zoneColors[5] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M139.080841,289.042572 
      C111.781128,303.851227 88.560524,323.029205 69.083603,346.748047 
      C68.244446,347.769958 67.316612,348.770081 66.262039,349.554474 
      C63.249023,351.795624 60.144970,352.065674 57.140018,349.502075 
      C53.997860,346.821442 53.355099,343.502991 55.700508,340.173676 
      C58.473465,336.237427 61.501530,332.440735 64.750031,328.886108 
      C87.015549,304.522278 112.659409,284.651764 142.707565,270.698669 
      C143.462769,270.347961 144.195999,269.946930 144.962555,269.624115 
      C149.509537,267.709290 153.451797,268.862061 155.206223,272.602570 
      C156.947006,276.313965 155.546188,280.392273 151.408264,282.720306 
      C147.493240,284.922974 143.409668,286.826050 139.080841,289.042572 
  z"
      />

      {/* hax to get 2 svgs together left  */}
      <path
        fill={zoneColors[5] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        className="scale-y-[0.915] "
        d="
  M56.603733,378.427734 
      C62.211937,380.040894 62.936855,384.208191 62.939503,388.783417 
      C62.949516,406.107056 62.955540,423.430695 62.958797,440.754333 
      C62.961269,453.913666 62.971172,467.072998 62.941330,480.232269 
      C62.936810,482.225220 62.941227,484.256256 62.579521,486.202362 
      C61.845985,490.149048 59.315868,492.395966 55.290077,492.416016 
      C51.385471,492.435486 49.220036,490.009918 48.387398,486.394836 
      C48.055305,484.952972 48.029015,483.418304 48.028103,481.925812 
      C48.009182,450.943146 47.984711,419.960388 48.034927,388.977814 
      C48.047276,381.357513 49.867081,379.160370 56.603733,378.427734 
  z"
      />
      <path
        fill={zoneColors[5] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M56.603733,378.427734 
      C62.211937,380.040894 62.936855,384.208191 62.939503,388.783417 
      C62.949516,406.107056 62.955540,423.430695 62.958797,440.754333 
      C62.961269,453.913666 62.971172,467.072998 62.941330,480.232269 
      C62.936810,482.225220 62.941227,484.256256 62.579521,486.202362 
      C61.845985,490.149048 59.315868,492.395966 55.290077,492.416016 
      C51.385471,492.435486 49.220036,490.009918 48.387398,486.394836 
      C48.055305,484.952972 48.029015,483.418304 48.028103,481.925812 
      C48.009182,450.943146 47.984711,419.960388 48.034927,388.977814 
      C48.047276,381.357513 49.867081,379.160370 56.603733,378.427734 
  z"
      />
      <path
        fill={zoneColors[2] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        className="scale-y-[1.29] "
        d="
  M56.603733,378.427734 
      C62.211937,380.040894 62.936855,384.208191 62.939503,388.783417 
      C62.949516,406.107056 62.955540,423.430695 62.958797,440.754333 
      C62.961269,453.913666 62.971172,467.072998 62.941330,480.232269 
      C62.936810,482.225220 62.941227,484.256256 62.579521,486.202362 
      C61.845985,490.149048 59.315868,492.395966 55.290077,492.416016 
      C51.385471,492.435486 49.220036,490.009918 48.387398,486.394836 
      C48.055305,484.952972 48.029015,483.418304 48.028103,481.925812 
      C48.009182,450.943146 47.984711,419.960388 48.034927,388.977814 
      C48.047276,381.357513 49.867081,379.160370 56.603733,378.427734 
  z"
      />

      {/* Resst */}
      <path
        fill={zoneColors[2] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M112.628052,691.362915 
      C92.435165,678.039307 75.008430,662.154053 59.577156,644.041260 
      C58.176682,642.397400 56.803604,640.692383 55.687664,638.852112 
      C53.629112,635.457397 53.688313,632.079224 56.924843,629.437683 
      C60.241444,626.730835 63.808903,626.946167 66.878937,629.840027 
      C69.292664,632.115234 71.340897,634.778687 73.546364,637.274170 
      C115.097275,684.287720 167.086563,710.550659 229.613846,716.174011 
      C245.993652,717.647156 262.197845,716.597839 278.465240,714.970581 
      C281.278290,714.689209 285.046509,715.462952 287.040955,717.242676 
      C291.318542,721.059692 288.558868,728.097168 282.252655,729.128235 
      C273.889557,730.495667 265.400513,731.533997 256.938293,731.781860 
      C204.800842,733.308655 156.705215,720.103210 112.628052,691.362915 
  z"
      />

      <path
        fill={zoneColors[3] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M417.930176,629.728760 
      C421.938568,627.293518 425.365753,627.797119 427.997894,631.121338 
      C430.959930,634.862244 429.241425,638.388794 426.673920,641.518494 
      C407.276581,665.163208 384.499786,684.854065 357.854858,699.956787 
      C352.214508,703.153809 346.451202,706.149231 340.636932,709.019653 
      C334.894440,711.854736 330.686523,710.942871 328.509125,706.738281 
      C326.363647,702.595337 328.193085,698.418884 333.908569,695.681580 
      C352.768860,686.648926 370.587006,675.909668 386.058105,661.824951 
      C396.364868,652.441772 405.692322,641.982971 415.464172,632.011658 
      C416.162018,631.299500 416.910187,630.636780 417.930176,629.728760 
  z"
      />

      {/* Battery Indicator */}
      <defs>
        <linearGradient id="batteryProgress" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="12.5%" stopColor={zoneColors[7] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="25%" stopColor={zoneColors[8] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="37.5%" stopColor={zoneColors[9] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="50%" stopColor={zoneColors[10] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="62.5%" stopColor={zoneColors[11] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="75%" stopColor={zoneColors[12] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="87.5%" stopColor={zoneColors[13] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="100%" stopColor={zoneColors[14] ?? KDefaultPreviewGlyphFillColor} />
        </linearGradient>
      </defs>
      <path
        fill="url(#batteryProgress)"
        opacity="1.000000"
        stroke="none"
        d="
  M237.318848,826.999756 
      C237.319046,813.841797 237.309387,801.183838 237.331497,788.525940 
      C237.334396,786.867493 237.308075,785.171021 237.628662,783.558472 
      C238.417191,779.592163 241.096344,777.387268 245.007690,777.409790 
      C248.907104,777.432251 251.592239,779.622070 252.329041,783.617798 
      C252.627731,785.237610 252.602112,786.930420 252.602859,788.590088 
      C252.617203,820.734558 252.615891,852.879028 252.606201,885.023499 
      C252.605743,886.519409 252.656479,888.042297 252.408447,889.506042 
      C251.704498,893.660706 249.257812,896.088684 244.942932,896.077576 
      C240.613541,896.066467 238.215912,893.559021 237.512833,889.442383 
      C237.235413,887.818054 237.326721,886.123169 237.325775,884.460388 
      C237.315002,865.473511 237.318863,846.486633 237.318848,826.999756 
  z"
      />
      <path
        fill={zoneColors[6] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
  M243.565384,936.047485 
      C237.330795,933.139343 235.148880,924.824097 238.924240,919.678223 
      C241.452576,916.231873 246.806915,915.547668 249.907654,918.485779 
      C253.699203,922.078308 253.072250,926.717529 251.983582,931.058533 
      C251.007965,934.948730 247.880493,936.439453 243.565384,936.047485 
  z"
      />
    </svg>
  );
}
