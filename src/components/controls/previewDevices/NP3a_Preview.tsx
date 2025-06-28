import { KDefaultPreviewGlyphFillColor } from '@/lib/consts';

// Component for the first path (zones 0-19)
function Path1({ zoneColors }: { zoneColors: string[] }) {
  return (
    <>
      <defs>
        <linearGradient id="path1Gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="5%" stopColor={zoneColors[0] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="10%" stopColor={zoneColors[1] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="15%" stopColor={zoneColors[2] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="20%" stopColor={zoneColors[3] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="25%" stopColor={zoneColors[4] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="30%" stopColor={zoneColors[5] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="35%" stopColor={zoneColors[6] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="40%" stopColor={zoneColors[7] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="45%" stopColor={zoneColors[8] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="50%" stopColor={zoneColors[9] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="55%" stopColor={zoneColors[10] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="60%" stopColor={zoneColors[11] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="65%" stopColor={zoneColors[12] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="70%" stopColor={zoneColors[13] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="75%" stopColor={zoneColors[14] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="80%" stopColor={zoneColors[15] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="85%" stopColor={zoneColors[16] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="90%" stopColor={zoneColors[17] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="95%" stopColor={zoneColors[18] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="100%" stopColor={zoneColors[19] ?? KDefaultPreviewGlyphFillColor} />
        </linearGradient>
      </defs>
      <path
        fill="url(#path1Gradient)"
        opacity="1.000000"
        stroke="none"
        d="
M181.091415,258.035217 
   C161.645828,286.508423 146.280853,316.702362 134.014969,348.500732 
   C131.620941,354.707062 129.451767,360.999939 127.158478,367.245422 
   C126.757240,368.338104 126.294281,369.412628 125.792099,370.463165 
   C120.475281,381.585510 110.647186,385.181458 98.776398,380.361816 
   C89.732971,376.690094 84.354614,365.021027 87.895683,355.245148 
   C95.093910,335.372925 102.576447,315.608215 111.180336,296.274597 
   C131.000381,251.737366 159.252594,213.049744 192.943390,178.172272 
   C216.425690,153.862869 242.131485,132.329819 272.096741,116.198372 
   C279.004089,112.479881 285.211456,113.021355 291.328674,117.028442 
   C298.063385,121.440010 302.956451,127.325829 302.020233,135.982468 
   C301.203796,143.531555 297.004120,149.452576 290.758148,153.494812 
   C275.495026,163.372711 261.016846,174.263351 246.788696,185.570404 
   C227.242355,201.103760 209.945892,218.747040 194.886963,238.604584 
   C190.162109,244.835068 185.812241,251.349915 181.091415,258.035217 
z"
      />
    </>
  );
}

// Component for the second path (zones 20-30)
function Path2({ zoneColors }: { zoneColors: string[] }) {
  return (
    <>
      <defs>
        <linearGradient id="path2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="9.091%" stopColor={zoneColors[20] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="18.182%" stopColor={zoneColors[21] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="27.273%" stopColor={zoneColors[22] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="36.364%" stopColor={zoneColors[23] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="45.455%" stopColor={zoneColors[24] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="54.546%" stopColor={zoneColors[25] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="63.637%" stopColor={zoneColors[26] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="72.728%" stopColor={zoneColors[27] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="81.819%" stopColor={zoneColors[28] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="90.910%" stopColor={zoneColors[29] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="100%" stopColor={zoneColors[30] ?? KDefaultPreviewGlyphFillColor} />
        </linearGradient>
      </defs>
      <path
        fill="url(#path2Gradient)"
        opacity="1.000000"
        stroke="none"
        d="
M898.844299,441.082611 
   C897.674988,430.379486 894.658020,420.476562 892.986755,410.322021 
   C891.243164,399.728546 897.793030,389.560333 907.606384,387.288086 
   C918.848145,384.685059 931.014526,391.152161 934.069580,401.558380 
   C937.869263,414.500916 939.927307,427.837006 941.863220,441.126007 
   C945.634033,467.010193 947.454346,493.089447 947.346619,519.260132 
   C947.222168,549.473328 943.670349,579.221008 936.746460,608.729370 
   C927.606201,647.683655 913.184082,684.525330 895.546509,720.264526 
   C892.601624,726.231934 890.131653,732.434387 887.166138,738.390747 
   C882.373779,748.016541 871.683594,753.496948 862.016479,751.552368 
   C852.529358,749.643982 843.960388,739.520447 843.397583,729.257629 
   C843.132141,724.417603 845.604492,720.287292 847.553772,716.065918 
   C857.877991,693.708069 868.772339,671.590820 877.782104,648.662048 
   C887.413330,624.151672 893.786865,598.792664 898.132263,572.734070 
   C902.650024,545.641785 904.537964,518.536377 903.673279,491.184143 
   C903.147217,474.542847 901.446899,457.982666 898.844299,441.082611 
z"
      />
    </>
  );
}

// Component for the third path (zones 31-35)
function Path3({ zoneColors }: { zoneColors: string[] }) {
  return (
    <>
      <defs>
        <linearGradient id="path3Gradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="20%" stopColor={zoneColors[31] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="40%" stopColor={zoneColors[32] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="60%" stopColor={zoneColors[33] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="80%" stopColor={zoneColors[34] ?? KDefaultPreviewGlyphFillColor} />
          <stop offset="100%" stopColor={zoneColors[35] ?? KDefaultPreviewGlyphFillColor} />
        </linearGradient>
      </defs>
      <path
        fill="url(#path3Gradient)"
        opacity="1.000000"
        stroke="none"
        d="
M159.338043,702.694702 
   C182.190933,734.284180 204.904068,765.534424 227.450836,796.904236 
   C232.754333,804.283142 233.734497,812.598083 228.648697,820.321838 
   C224.735916,826.264221 218.176926,829.567810 211.214783,830.328125 
   C204.467285,831.065125 199.256943,827.384155 195.262466,821.810425 
   C168.873489,784.987610 142.426407,748.206299 115.911331,711.474182 
   C110.927887,704.570435 108.506371,697.346069 111.567139,689.013672 
   C113.980911,682.442566 118.910461,678.764099 125.699516,677.876526 
   C134.783066,676.688904 142.518997,679.385010 148.112976,686.947388 
   C151.875137,692.033386 155.468613,697.244141 159.338043,702.694702 
z"
      />
    </>
  );
}

export default function NP3a_Preview({ zoneColors }: { zoneColors: string[] }) {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox="0 0 1055 2000"
      enableBackground="new 0 0 1024 896"
      xmlSpace="preserve"
    >
      <Path1 zoneColors={zoneColors} />
      <Path2 zoneColors={zoneColors} />
      <Path3 zoneColors={zoneColors} />
    </svg>
  );
}
