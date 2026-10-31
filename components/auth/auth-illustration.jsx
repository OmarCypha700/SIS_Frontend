/**
 * Decorative illustration for the sign-in pages: a student studying in front of a screen and tablet
 * showing a graduation cap. Every colour except skin tone is derived from --primary, so it follows the
 * brand colour set in Institution settings and adapts to light and dark mode.
 */

/** A gear outline as a polygon: flat roots between trapezoid teeth. */
function gear(cx, cy, outer, root, teeth) {
  const step = (2 * Math.PI) / teeth;
  const at = (angle, r) => `${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`;
  const points = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    points.push(at(a - step * 0.27, root), at(a - step * 0.16, outer), at(a + step * 0.16, outer), at(a + step * 0.27, root));
  }
  return `M ${points.join(" L ")} Z`;
}

const BIG_GEAR = gear(518, 460, 165, 132, 8);
const SMALL_GEAR = gear(805, 470, 108, 86, 8);

const PALETTE = {
  "--ill-deep": "color-mix(in oklch, var(--primary) 55%, black)",
  "--ill-main": "var(--primary)",
  "--ill-shade": "color-mix(in oklch, var(--primary) 80%, black)",
  "--ill-book": "color-mix(in oklch, var(--primary) 70%, var(--background))",
  "--ill-soft": "color-mix(in oklch, var(--primary) 42%, var(--background))",
  "--ill-screen": "color-mix(in oklch, var(--primary) 28%, var(--background))",
  "--ill-faint": "color-mix(in oklch, var(--primary) 10%, var(--background))",
  "--ill-shirt": "color-mix(in oklch, var(--primary) 5%, white)",
  "--ill-skin": "#94412f",
  "--ill-skin-shade": "#7a3326",
};

export function AuthIllustration({ className }) {
  return (
    <svg viewBox="170 220 1600 1500" className={className} style={PALETTE} aria-hidden="true" focusable="false">
      {/* Backdrop */}
      <circle cx="1050" cy="930" r="690" fill="var(--ill-faint)" />
      <g fill="none" stroke="var(--ill-soft)" strokeWidth="8" strokeDasharray="22 18" strokeLinecap="round" opacity="0.6">
        <circle cx="510" cy="445" r="225" />
        <circle cx="800" cy="455" r="150" />
      </g>

      {/* Gears */}
      <g fill="var(--ill-soft)">
        <path d={BIG_GEAR} />
        <path d={SMALL_GEAR} />
      </g>
      <g fill="none" stroke="var(--ill-faint)" strokeWidth="5" opacity="0.8">
        <circle cx="518" cy="460" r="88" />
        <circle cx="518" cy="460" r="34" />
        <circle cx="805" cy="470" r="58" />
        <circle cx="805" cy="470" r="22" />
      </g>

      {/* Monitor */}
      <rect x="860" y="1380" width="370" height="170" fill="var(--ill-deep)" />
      <rect x="200" y="522" width="1530" height="872" rx="80" fill="var(--ill-deep)" />
      <rect x="243" y="548" width="1437" height="752" rx="46" fill="var(--ill-screen)" />
      <line x1="245" y1="1318" x2="1690" y2="1318" stroke="var(--ill-soft)" strokeWidth="4" />
      <circle cx="979" cy="1355" r="15" fill="none" stroke="var(--ill-soft)" strokeWidth="4" />

      {/* Graduation cap on the monitor */}
      <g fill="var(--ill-main)">
        <path d="M712 795 L1020 670 Q1027 667 1034 670 L1340 795 Q1352 808 1340 820 L1000 958 Q992 962 984 958 L712 822 Q698 808 712 795 Z" />
        <path d="M788 885 L805 1000 Q810 1028 840 1035 Q1010 1095 1170 1035 Q1185 1025 1190 1010 L1226 890 L992 978 Z" />
        <path d="M1324 900 C1290 960 1290 1020 1325 1052 C1360 1010 1360 960 1324 900 Z" />
      </g>
      <line x1="1329" y1="845" x2="1324" y2="905" stroke="var(--ill-main)" strokeWidth="10" strokeLinecap="round" />

      {/* Leaves */}
      <g fill="var(--ill-soft)">
        <path d="M1170 1178 C1255 1230 1258 1400 1232 1612 C1148 1500 1138 1300 1170 1178 Z" />
        <path d="M1082 1318 C1185 1352 1245 1455 1236 1606 C1150 1560 1118 1420 1082 1318 Z" />
      </g>
      <g fill="none" stroke="var(--ill-faint)" strokeWidth="4" strokeLinecap="round">
        <path d="M1198 1228 C1222 1330 1230 1450 1228 1560" />
        <path d="M1158 1410 C1185 1460 1210 1520 1225 1585" />
      </g>

      {/* Tablet */}
      <rect x="1235" y="1165" width="350" height="525" rx="34" fill="var(--ill-deep)" />
      <rect x="1258" y="1193" width="310" height="432" rx="26" fill="var(--ill-screen)" />
      <rect x="1372" y="1175" width="75" height="9" rx="4.5" fill="var(--ill-soft)" />
      <g fill="var(--ill-main)">
        <path d="M1296 1404 L1404 1360 L1520 1404 L1520 1412 L1400 1460 L1296 1412 Z" />
        <path d="M1322 1436 L1330 1490 Q1400 1520 1470 1490 L1482 1440 L1400 1470 Z" />
        <path d="M1516 1448 C1502 1475 1502 1500 1516 1524 C1530 1500 1530 1475 1516 1448 Z" />
      </g>
      <line x1="1517" y1="1414" x2="1516" y2="1452" stroke="var(--ill-main)" strokeWidth="5" />

      {/* Books */}
      <rect x="288" y="1505" width="724" height="185" rx="10" fill="var(--ill-book)" />
      <rect x="802" y="1525" width="31" height="135" rx="4" fill="var(--ill-screen)" opacity="0.7" />
      <rect x="846" y="1525" width="85" height="135" rx="4" fill="var(--ill-screen)" opacity="0.7" />
      <rect x="283" y="1355" width="602" height="145" rx="20" fill="var(--ill-soft)" />
      <rect x="327" y="1378" width="545" height="100" rx="30" fill="var(--ill-faint)" />
      <g stroke="var(--ill-soft)" strokeWidth="4">
        <line x1="342" y1="1400" x2="855" y2="1400" />
        <line x1="342" y1="1416" x2="855" y2="1416" />
        <line x1="342" y1="1432" x2="855" y2="1432" />
        <line x1="342" y1="1448" x2="855" y2="1448" />
        <line x1="342" y1="1464" x2="855" y2="1464" />
      </g>

      {/* Student */}
      <path d="M425 1095 C415 1150 420 1210 455 1240 L490 1235 L478 1100 Z" fill="var(--ill-skin)" />
      <path d="M722 1095 C732 1150 727 1210 692 1240 L657 1235 L669 1100 Z" fill="var(--ill-skin)" />
      <rect x="548" y="955" width="64" height="50" fill="var(--ill-skin-shade)" />
      <path d="M435 1095 C445 1035 480 995 522 985 Q575 1030 628 985 C672 995 708 1035 720 1095 L678 1118 L680 1160 L475 1160 L477 1118 Z" fill="var(--ill-shirt)" />
      <ellipse cx="578" cy="905" rx="54" ry="72" fill="var(--ill-skin)" />
      <path d="M527 905 C512 848 538 822 575 830 C612 816 640 842 668 812 C682 855 660 905 628 918 C612 884 572 872 548 884 Z" fill="var(--ill-deep)" />
      <path d="M690 1205 C772 1200 806 1255 766 1292 C690 1328 520 1362 345 1368 L340 1330 C460 1310 582 1270 640 1235 Z" fill="var(--ill-main)" />
      <path d="M455 1205 C378 1195 344 1262 396 1296 C472 1332 640 1362 786 1368 L790 1330 C680 1300 560 1250 520 1215 Z" fill="var(--ill-shade)" />
      <ellipse cx="438" cy="1345" rx="22" ry="18" fill="var(--ill-skin)" />
      <ellipse cx="692" cy="1345" rx="22" ry="18" fill="var(--ill-skin)" />
      <rect x="467" y="1140" width="215" height="135" rx="8" fill="var(--ill-deep)" />
      <circle cx="573" cy="1182" r="13" fill="var(--ill-soft)" />
    </svg>
  );
}
