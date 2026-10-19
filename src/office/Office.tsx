import { useState } from "react";
import { motion } from "motion/react";
import type { Agent, Task, RoomId } from "../../shared/studio";
import {
  locationFor,
  memberStatus,
  roomNames,
  statusNames,
} from "../../shared/studio";
import { Icon, type IconName, Button } from "../components/ui";
type Room = {
  id: RoomId;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  icon: IconName;
};
const rooms: Room[] = [
  {
    id: "meeting",
    x: 32,
    y: 36,
    w: 297,
    h: 231,
    color: "#c4b8ee",
    icon: "meeting",
  },
  {
    id: "research",
    x: 350,
    y: 36,
    w: 260,
    h: 231,
    color: "#a5cec5",
    icon: "research",
  },
  {
    id: "computer",
    x: 632,
    y: 36,
    w: 335,
    h: 231,
    color: "#adcae9",
    icon: "computer",
  },
  {
    id: "design",
    x: 32,
    y: 349,
    w: 297,
    h: 240,
    color: "#e7b8ce",
    icon: "design",
  },
  {
    id: "lounge",
    x: 350,
    y: 349,
    w: 317,
    h: 240,
    color: "#d6c7ae",
    icon: "lounge",
  },
  {
    id: "review",
    x: 689,
    y: 349,
    w: 278,
    h: 240,
    color: "#bdcda8",
    icon: "review",
  },
];
const seats: Record<RoomId, [number, number][]> = {
  meeting: [
    [110, 170],
    [184, 170],
    [257, 170],
    [110, 217],
    [184, 217],
    [257, 217],
  ],
  research: [
    [405, 171],
    [479, 171],
    [551, 171],
    [405, 217],
    [479, 217],
    [551, 217],
  ],
  computer: [
    [691, 170],
    [788, 170],
    [897, 170],
    [691, 220],
    [788, 220],
    [897, 220],
  ],
  design: [
    [100, 485],
    [184, 485],
    [260, 485],
    [100, 537],
    [184, 537],
    [260, 537],
  ],
  review: [
    [739, 485],
    [820, 485],
    [899, 485],
    [739, 540],
    [820, 540],
    [899, 540],
  ],
  lounge: [
    [391, 470],
    [487, 470],
    [583, 470],
    [403, 535],
    [507, 535],
    [611, 535],
  ],
};
function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="13" rx="13" ry="6" fill="#5e6c6117" />
      <path d="M-10 0H10L8 14H-7Z" fill="#e7e1d4" />
      <ellipse rx="10" ry="3" fill="#f6f4ec" />
      <path
        d="M0 0V-31M0-5Q-20-13-16-26Q1-23 0-5M0-12Q18-16 16-32Q1-31 0-12M0-21Q-9-30-2-40Q7-34 0-21"
        stroke="#789481"
        strokeWidth="2"
        fill="#95ad91"
      />
    </g>
  );
}
function Monitor({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-30" y="0" width="60" height="6" rx="3" fill="#a7b2b4" />
      <rect x="-3" y="-20" width="6" height="23" fill="#9ca9ad" />
      <rect x="-33" y="-50" width="66" height="41" rx="5" fill="#8d9da3" />
      <rect x="-29" y="-46" width="58" height="32" rx="3" fill="#d8e8eb" />
      <path
        d="M-21-37H-2M-21-31H16M-21-25H8"
        stroke="#9fbdc7"
        strokeWidth="2"
      />
      <rect
        x="-26"
        y="13"
        width="52"
        height="13"
        rx="3"
        fill="#e2e7e6"
        stroke="#c8d1d0"
      />
    </g>
  );
}
function Furniture({ room }: { room: RoomId }) {
  if (room === "meeting")
    return (
      <g>
        <rect
          x="95"
          y="100"
          width="166"
          height="75"
          rx="32"
          fill="#d9d3c7"
          filter="url(#softShadow)"
        />
        <rect
          x="95"
          y="95"
          width="166"
          height="75"
          rx="32"
          fill="#efebe2"
          stroke="#d3ccc0"
        />
        <path d="M129 96V168M224 96V168" stroke="#e2dcd0" />
        <rect x="154" y="118" width="44" height="27" rx="5" fill="#c7cbd4" />
        <rect x="157" y="121" width="38" height="20" rx="2" fill="#e9ecf2" />
        {[118, 178, 238].map((x) => (
          <g key={x}>
            <rect
              x={x - 12}
              y="77"
              width="25"
              height="13"
              rx="6"
              fill="#c9c0d4"
            />
            <rect
              x={x - 12}
              y="179"
              width="25"
              height="13"
              rx="6"
              fill="#c9c0d4"
            />
          </g>
        ))}
        <rect x="76" y="58" width="109" height="9" rx="3" fill="#d6d9e2" />
        <rect x="82" y="45" width="97" height="14" rx="3" fill="#b8c9d2" />
        <Plant x={298} y={233} />
      </g>
    );
  if (room === "research")
    return (
      <g>
        <rect x="367" y="54" width="225" height="25" rx="3" fill="#e0d6c3" />
        {Array.from({ length: 21 }, (_, i) => (
          <rect
            key={i}
            x={373 + i * 10}
            y={54 + (i % 3) * 2}
            width="7"
            height={19 - (i % 3) * 2}
            rx="1"
            fill={["#aec0b5", "#cec4b4", "#bac9d8", "#d7bcaf"][i % 4]}
          />
        ))}
        <rect
          x="403"
          y="116"
          width="151"
          height="53"
          rx="10"
          fill="#ede4d6"
          stroke="#d9cfbc"
          filter="url(#softShadow)"
        />
        <path
          d="M459 128Q476 123 479 131Q490 123 509 128V153Q490 148 479 155Q470 147 459 152Z"
          fill="#fffef4"
          stroke="#d1c7ad"
        />
        <path d="M480 132V152" stroke="#d1c7ad" />
        <rect x="418" y="129" width="27" height="34" rx="2" fill="#b4c5b7" />
        <Plant x={579} y={230} />
      </g>
    );
  if (room === "computer")
    return (
      <g>
        {[695, 798, 902].map((x) => (
          <g key={x}>
            <rect
              x={x - 42}
              y="123"
              width="85"
              height="56"
              rx="7"
              fill="#e5e1d8"
              stroke="#d1d3ce"
              filter="url(#softShadow)"
            />
            <Monitor x={x} y={146} />
            <rect
              x={x - 13}
              y="188"
              width="28"
              height="16"
              rx="6"
              fill="#bac8d4"
            />
          </g>
        ))}
        <Plant x={943} y={69} scale={0.85} />
      </g>
    );
  if (room === "design")
    return (
      <g>
        <rect
          x="75"
          y="409"
          width="184"
          height="72"
          rx="10"
          fill="#e9dfd8"
          stroke="#d9cfc6"
          filter="url(#softShadow)"
        />
        <rect
          x="88"
          y="419"
          width="66"
          height="48"
          rx="3"
          fill="#fffaf2"
          stroke="#e0d6c8"
        />
        <path d="M93 459L110 433L125 449L140 438L149 459Z" fill="#c2bdcf" />
        <circle cx="137" cy="430" r="5" fill="#e5c697" />
        <Monitor x={209} y={443} />
        <rect x="49" y="384" width="10" height="141" rx="4" fill="#c9b8a6" />
        <rect x="42" y="398" width="26" height="75" rx="4" fill="#eee7dc" />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x="46"
            y={405 + i * 16}
            width="18"
            height="12"
            rx="2"
            fill={["#bca6cf", "#d9b1b8", "#aac9c8", "#e0c58e"][i]}
          />
        ))}
        <Plant x={294} y={554} />
      </g>
    );
  if (room === "review")
    return (
      <g>
        <rect
          x="732"
          y="412"
          width="161"
          height="64"
          rx="9"
          fill="#e7e3d7"
          stroke="#d4d0c3"
          filter="url(#softShadow)"
        />
        <Monitor x={778} y={446} />
        <rect
          x="835"
          y="424"
          width="39"
          height="42"
          rx="3"
          fill="#f7f5e9"
          stroke="#d9d6c6"
        />
        <path
          d="M842 436L845 439L851 431M857 436H867M842 448L845 451L851 443M857 448H867"
          stroke="#a3b096"
          fill="none"
          strokeWidth="2"
        />
        <Plant x={930} y={555} />
      </g>
    );
  return (
    <g>
      <rect
        x="374"
        y="401"
        width="136"
        height="52"
        rx="14"
        fill="#d1d8ca"
        filter="url(#softShadow)"
      />
      <rect x="380" y="395" width="125" height="36" rx="12" fill="#dce3d4" />
      <path d="M423 400V430M465 400V430" stroke="#c1cdbb" />
      <rect x="379" y="427" width="126" height="18" rx="6" fill="#c9d4c2" />
      <rect x="531" y="491" width="111" height="51" rx="13" fill="#d5d1c8" />
      <rect x="536" y="497" width="101" height="36" rx="8" fill="#e6e1d7" />
      <rect
        x="409"
        y="482"
        width="94"
        height="47"
        rx="19"
        fill="#e9e0cb"
        stroke="#d8ccb3"
      />
      <circle cx="436" cy="498" r="7" fill="#fffaf0" stroke="#cbbda3" />
      <circle cx="436" cy="498" r="4" fill="#b49a7b" />
      <rect x="465" y="493" width="22" height="24" rx="2" fill="#c5cbb9" />
      <Plant x={628} y={422} scale={1.15} />
      <rect x="555" y="376" width="42" height="37" rx="5" fill="#dfdcd2" />
      <rect x="560" y="380" width="32" height="17" rx="3" fill="#aebdb8" />
      <circle cx="575" cy="404" r="3" fill="#a7b0a7" />
    </g>
  );
}
export function Office({
  agents,
  tasks,
  selected,
  onSelect,
  onRoomSelect,
}: {
  agents: Agent[];
  tasks: Task[];
  selected: string;
  onSelect: (id: string) => void;
  onRoomSelect: (id: RoomId) => void;
}) {
  const [zoom, setZoom] = useState(1),
    [activeRoom, setActiveRoom] = useState<RoomId | null>(null);
  const occupied: Record<string, number> = {};
  const memberLocations = agents.map((a) => {
    const own = tasks.filter((t) => t.agentId === a.id);
    const room = locationFor(a.id, own);
    const index = occupied[room] ?? 0;
    occupied[room] = index + 1;
    return {
      agent: a,
      room,
      position: seats[room][index % 6],
      status: memberStatus(own),
    };
  });
  return (
    <div className="map-shell">
      <div className="floor-heading">
        <span>
          <i className="live-dot" />
          オフィス全体
        </span>
        <span>
          6ルーム <i /> {agents.length}メンバー
        </span>
      </div>
      <div className="map-viewport">
        <motion.div
          className="office-map"
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        >
          <svg
            viewBox="0 0 1000 625"
            role="img"
            aria-label="会議室、リサーチ室、PCルーム、制作室、レビュー室、ラウンジを配置したオフィス間取り"
          >
            <defs>
              <filter id="softShadow">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="3"
                  floodColor="#7d8b91"
                  floodOpacity=".12"
                />
              </filter>
              <pattern
                id="floor"
                width="44"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M44 0H0V44"
                  stroke="#e4e6e6"
                  strokeWidth=".6"
                  fill="none"
                />
              </pattern>
              <pattern
                id="wood"
                width="60"
                height="14"
                patternUnits="userSpaceOnUse"
              >
                <rect width="60" height="14" fill="#f4f1e9" />
                <path d="M0 14H60M30 0V14" stroke="#e9e4d9" strokeWidth=".6" />
              </pattern>
              <linearGradient id="glassWall" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#fff" stopOpacity=".8" />
                <stop offset="1" stopColor="#c5dce4" stopOpacity=".35" />
              </linearGradient>
            </defs>
            <rect
              x="14"
              y="20"
              width="974"
              height="588"
              rx="23"
              fill="#e4e8e8"
              filter="url(#softShadow)"
            />
            <rect
              x="20"
              y="20"
              width="962"
              height="579"
              rx="20"
              fill="#f3f5f5"
              stroke="#d8dfe1"
            />
            <rect
              x="20"
              y="20"
              width="962"
              height="579"
              rx="20"
              fill="url(#floor)"
            />
            <path
              d="M32 308H967"
              stroke="#e5e9e9"
              strokeWidth="1"
              strokeDasharray="3 8"
            />
            <text
              x="499"
              y="314"
              textAnchor="middle"
              fontSize="10"
              fill="#b6c0c1"
              letterSpacing="5"
            >
              STUDIO 01
            </text>
            {rooms.map((r) => (
              <g key={r.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx="9"
                  fill={r.id === "lounge" ? "url(#wood)" : "#fafbf9"}
                  stroke="#dfe4e3"
                  strokeWidth="1.5"
                />
                <rect
                  x={r.x + 3}
                  y={r.y + 3}
                  width={r.w - 6}
                  height={r.h - 6}
                  rx="7"
                  fill={r.color}
                  opacity={activeRoom === r.id ? 0.13 : 0.035}
                />
                <path
                  d={`M${r.x + 2} ${r.y + r.h - 3}H${r.x + r.w * 0.42} M${r.x + r.w * 0.62} ${r.y + r.h - 3}H${r.x + r.w - 2}`}
                  stroke="#bccdd0"
                  strokeWidth="7"
                />
                <path
                  d={`M${r.x + 2} ${r.y + r.h - 8}H${r.x + r.w * 0.42} M${r.x + r.w * 0.62} ${r.y + r.h - 8}H${r.x + r.w - 2}`}
                  stroke="url(#glassWall)"
                  strokeWidth="14"
                />
                <Furniture room={r.id} />
              </g>
            ))}
            <Plant x={30} y={322} scale={0.7} />
            <Plant x={967} y={322} scale={0.7} />
          </svg>
          {rooms.map((r) => (
            <button
              key={r.id}
              className={`room-control ${activeRoom === r.id ? "selected" : ""}`}
              style={{
                left: `${(r.x + 13) / 10}%`,
                top: `${(r.y + 12) / 6.25}%`,
              }}
              aria-label={`${roomNames[r.id]}を表示`}
              onClick={() => {
                setActiveRoom(r.id);
                onRoomSelect(r.id);
              }}
            >
              <Icon name={r.icon} size={13} />
              <span>{roomNames[r.id]}</span>
              <span className="room-count">{occupied[r.id] ?? 0}</span>
            </button>
          ))}
          {memberLocations.map(
            ({ agent: a, position: [x, y], status, room }) => (
              <motion.button
                key={a.id}
                className={`map-member ${selected === a.id ? "selected" : ""} ${status}`}
                initial={false}
                animate={{ left: `${x / 10}%`, top: `${y / 6.25}%` }}
                transition={{
                  type: "spring",
                  stiffness: 65,
                  damping: 18,
                  mass: 1.2,
                }}
                onClick={() => onSelect(a.id)}
                aria-label={`${a.name}、${roomNames[room]}、${statusNames[status]}`}
              >
                <span
                  className="map-person"
                  style={{ "--member-color": a.color } as React.CSSProperties}
                >
                  <i className="head" />
                  <i className="torso" />
                  <i className="shadow" />
                  {status === "working" && (
                    <span className="working-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                  {status === "review" && (
                    <span className="member-notification">!</span>
                  )}
                </span>
                <span className="map-name">{a.name}</span>
              </motion.button>
            ),
          )}
        </motion.div>
      </div>
      <div className="map-toolbar glass">
        <div className="map-statuses">
          <span>
            <i className="status-dot working" />
            作業中
          </span>
          <span>
            <i className="status-dot review" />
            承認待ち
          </span>
          <span>
            <i className="status-dot idle" />
            待機中
          </span>
        </div>
        <div className="zoom-controls">
          <Button
            icon="zoomOut"
            title="縮小"
            variant="icon-button"
            disabled={zoom <= 0.85}
            onClick={() => setZoom(Math.max(0.85, zoom - 0.1))}
          />
          <button
            className="zoom-reset"
            onClick={() => setZoom(1)}
            aria-label="倍率をリセット"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            icon="zoomIn"
            title="拡大"
            variant="icon-button"
            disabled={zoom >= 1.3}
            onClick={() => setZoom(Math.min(1.3, zoom + 0.1))}
          />
        </div>
      </div>
    </div>
  );
}
