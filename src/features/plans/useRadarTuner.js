import { useCallback, useMemo, useState } from 'react';
import { BUILDING_ID, RADAR_OVERRIDES } from '../../data/floorPlanRadarData';
import { deriveFloorFacing, resolveFacing, snapToCompass, wrap360, yawOf } from './floorPlanRadar';

// Session-only dial-ins for the ?radar=1 tuner. Nothing here touches disk — Copy puts a
// ready-to-paste RADAR_OVERRIDES literal (the file's own overrides merged with this
// session's nudges) on the clipboard, and pasting it into floorPlanRadarData.js is the
// one save step, by hand, after reviewing what changed.

const emptyBucket = () => ({ building: {}, floor: {}, room: {} });

function getAt(bucket, scope, buildingId, floorLabel, regionName) {
  if (scope === 'building') return bucket.building[buildingId] ?? null;
  if (scope === 'floor') return bucket.floor[buildingId]?.[floorLabel] ?? null;
  return bucket.room[buildingId]?.[floorLabel]?.[regionName] ?? null;
}

function setAt(bucket, scope, buildingId, floorLabel, regionName, value) {
  const next = {
    building: { ...bucket.building },
    floor: { ...bucket.floor },
    room: { ...bucket.room },
  };
  if (scope === 'building') {
    next.building[buildingId] = value;
  } else if (scope === 'floor') {
    next.floor[buildingId] = { ...next.floor[buildingId], [floorLabel]: value };
  } else {
    next.room[buildingId] = {
      ...next.room[buildingId],
      [floorLabel]: { ...next.room[buildingId]?.[floorLabel], [regionName]: value },
    };
  }
  return next;
}

function clearAt(bucket, scope, buildingId, floorLabel, regionName) {
  const next = {
    building: { ...bucket.building },
    floor: { ...bucket.floor },
    room: { ...bucket.room },
  };
  if (scope === 'building') {
    delete next.building[buildingId];
  } else if (scope === 'floor') {
    if (next.floor[buildingId]) {
      const forBuilding = { ...next.floor[buildingId] };
      delete forBuilding[floorLabel];
      next.floor[buildingId] = forBuilding;
    }
  } else if (next.room[buildingId]?.[floorLabel]) {
    const forFloor = { ...next.room[buildingId][floorLabel] };
    delete forFloor[regionName];
    next.room[buildingId] = { ...next.room[buildingId], [floorLabel]: forFloor };
  }
  return next;
}

function mergeOverrides(file, session) {
  return {
    building: { ...file.building, ...session.building },
    floor: {
      ...file.floor,
      [BUILDING_ID]: { ...file.floor[BUILDING_ID], ...session.floor[BUILDING_ID] },
    },
    room: {
      ...file.room,
      [BUILDING_ID]: mergeRoomsByFloor(file.room[BUILDING_ID], session.room[BUILDING_ID]),
    },
  };
}

// { [floorLabel]: { [regionName]: degrees } } from the file and from this session,
// session entries winning per-room.
function mergeRoomsByFloor(fileRooms, sessionRooms) {
  const floorLabels = new Set([...Object.keys(fileRooms ?? {}), ...Object.keys(sessionRooms ?? {})]);
  const merged = {};
  for (const floorLabel of floorLabels) {
    merged[floorLabel] = { ...fileRooms?.[floorLabel], ...sessionRooms?.[floorLabel] };
  }
  return merged;
}

function countEntries(bucket) {
  const buildingCount = Object.keys(bucket.building).length;
  const floorCount = Object.values(bucket.floor).reduce((n, f) => n + Object.keys(f).length, 0);
  const roomCount = Object.values(bucket.room).reduce(
    (n, byFloor) => n + Object.values(byFloor).reduce((m, r) => m + Object.keys(r).length, 0),
    0,
  );
  return buildingCount + floorCount + roomCount;
}

function formatOverridesLiteral(overrides) {
  return `export const RADAR_OVERRIDES = ${JSON.stringify(overrides, null, 2)};\n`;
}

export function useRadarTuner({ floorLabel, regionName, baselineDeg }) {
  const [scope, setScope] = useState('room');
  const [session, setSession] = useState(emptyBucket);
  const [copied, setCopied] = useState(false);

  const merged = useMemo(() => mergeOverrides(RADAR_OVERRIDES, session), [session]);

  const derived = useMemo(
    () => deriveFloorFacing(merged.room[BUILDING_ID]?.[floorLabel]),
    [merged, floorLabel],
  );

  const fileFacing = useMemo(
    () =>
      Math.round(
        resolveFacing({
          buildingId: BUILDING_ID,
          floorLabel,
          regionName,
          baselineDeg,
          overrides: RADAR_OVERRIDES,
        }),
      ),
    [floorLabel, regionName, baselineDeg],
  );

  const facing = useMemo(
    () =>
      Math.round(
        resolveFacing({
          buildingId: BUILDING_ID,
          floorLabel,
          regionName,
          baselineDeg,
          overrides: merged,
        }),
      ),
    [merged, floorLabel, regionName, baselineDeg],
  );

  const count = useMemo(() => countEntries(session), [session]);

  const onNudge = useCallback(
    (step) => {
      const existing = getAt(merged, scope, BUILDING_ID, floorLabel, regionName);
      const current =
        (existing != null ? yawOf(existing) : null) ??
        (scope === 'room' ? (derived?.floor ?? snapToCompass(baselineDeg)) : snapToCompass(baselineDeg));
      // Nudging always writes a plain number back — a fresh, simple heading dial-in.
      // Anything richer (a pan window, a pitch/fov tweak) is authored by hand afterward,
      // same as Office_1's entry in floorPlanRadarData.js.
      const next = wrap360(current + step);
      setSession((s) => setAt(s, scope, BUILDING_ID, floorLabel, regionName, next));
    },
    [merged, scope, floorLabel, regionName, derived, baselineDeg],
  );

  const onReset = useCallback(() => {
    setSession((s) => clearAt(s, scope, BUILDING_ID, floorLabel, regionName));
  }, [scope, floorLabel, regionName]);

  const onClear = useCallback(() => setSession(emptyBucket()), []);

  const onCopy = useCallback(() => {
    const text = formatOverridesLiteral(merged);
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }, [merged]);

  return { scope, onScope: setScope, facing, fileFacing, derived, count, copied, onNudge, onReset, onClear, onCopy };
}
