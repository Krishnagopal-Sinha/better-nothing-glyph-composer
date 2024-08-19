import { KDefaultPreviewGlyphFillColor } from "@/lib/consts";

export default function NP2a_Preview({ zoneColors }: { zoneColors: string[] }) {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100%"
      viewBox="210 -40 400 900"
      enable-background="new 0 0 800 800"
    >
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop
            offset="4.166%"
            stopColor={zoneColors[0] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="8.332%"
            stopColor={zoneColors[1] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="12.498%"
            stopColor={zoneColors[2] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="16.664%"
            stopColor={zoneColors[3] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="20.830%"
            stopColor={zoneColors[4] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="24.996%"
            stopColor={zoneColors[5] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="29.162%"
            stopColor={zoneColors[6] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="33.32%"
            stopColor={zoneColors[7] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="37.494%"
            stopColor={zoneColors[8] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="41.660%"
            stopColor={zoneColors[9] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="45.826%"
            stopColor={zoneColors[10] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="50%"
            stopColor={zoneColors[11] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="54.168%"
            stopColor={zoneColors[12] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="58.334%"
            stopColor={zoneColors[13] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="62.490%"
            stopColor={zoneColors[14] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="66.656%"
            stopColor={zoneColors[15] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="70.822%"
            stopColor={zoneColors[16] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="74.988%"
            stopColor={zoneColors[17] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="79.154%"
            stopColor={zoneColors[18] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="83.320%"
            stopColor={zoneColors[19] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="87.486%"
            stopColor={zoneColors[20] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="91.652%"
            stopColor={zoneColors[21] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="94.818%"
            stopColor={zoneColors[22] ?? KDefaultPreviewGlyphFillColor}
          />
          <stop
            offset="97%"
            stopColor={zoneColors[23] ?? KDefaultPreviewGlyphFillColor}
          />
          {/* add 97 and 100 cuz 100 alone did not look right */}
          <stop
            offset="100%"
            stopColor={zoneColors[23] ?? KDefaultPreviewGlyphFillColor}
          />
        </linearGradient>
      </defs>

      <path
        fill="url(#progressGradient)"
        opacity="1.000000"
        stroke="none"
        d="
M283.713074,134.987885 
	C280.487366,142.405380 277.023804,149.388931 274.266846,156.641113 
	C272.778961,160.555038 270.686584,162.935272 266.651886,161.749527 
	C262.623688,160.565704 261.694305,157.228485 263.019379,153.323868 
	C264.299164,149.552719 265.596771,145.787628 266.630920,141.648300 
	C266.375275,141.276718 266.474335,141.225769 266.474335,141.225769 
	C268.455414,137.718521 270.436462,134.211288 272.522034,130.336105 
	C285.427673,106.448082 303.090668,87.538620 326.073517,73.696495 
	C328.346802,72.327316 330.759979,71.188431 333.120422,69.966217 
	C336.712524,68.106232 339.421143,69.729530 341.098938,72.689102 
	C342.798004,75.686172 341.679657,78.054619 338.709290,80.205185 
	C328.632416,87.500832 318.386505,94.650055 308.964203,102.739372 
	C298.576599,111.657478 290.527313,122.725975 283.713074,134.987885 
z"
      />

      <path
        fill={zoneColors[24] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
M546.601074,155.248077 
	C546.566589,184.834946 546.535522,213.953033 546.481934,243.071045 
	C546.479187,244.562302 546.843872,246.539383 546.060364,247.443970 
	C544.383728,249.379715 542.020203,252.070694 540.024902,252.000061 
	C538.034485,251.929611 535.987427,249.002884 534.307007,247.036285 
	C533.714111,246.342407 534.093506,244.785431 534.092896,243.622498 
	C534.078552,214.503860 534.070251,185.385208 534.071045,156.266571 
	C534.071106,154.437195 534.142334,152.607452 534.200623,150.778519 
	C534.320740,147.003983 536.426392,144.724564 540.024536,144.593140 
	C543.604309,144.462357 545.929565,146.555054 546.352051,150.296692 
	C546.519714,151.781281 546.522217,153.284515 546.601074,155.248077 
z"
      />

      <path
        fill={zoneColors[25] ?? KDefaultPreviewGlyphFillColor}
        opacity="1.000000"
        stroke="none"
        d="
M304.452515,302.848694 
	C298.177338,303.444153 294.983856,298.773560 292.284241,295.130005 
	C284.559418,284.704163 277.581848,273.709961 270.617920,262.743958 
	C268.543823,259.477936 268.288239,255.616959 272.317108,253.138199 
	C275.620270,251.105927 278.954010,252.657608 281.371674,257.358734 
	C287.869141,269.992950 295.711456,281.640442 305.760468,291.766113 
	C309.448700,295.482483 309.006683,298.898621 304.452515,302.848694 
z"
      />
    </svg>
  );
}
