import { STAFF_ROLE } from "./staffRoles.js";
import { getStaffSegment } from "./staffRoutes.js";

/**
 * Staff portal navigation — split by role.
 * Role 2 (Restaurant Staff): floor operations + KDS (user-JWT, Ready/Served actions)
 * KDS Device (device-JWT): /kds route directly, no sidebar
 */
export const STAFF_NAV = [
  {
    group: "Floor Operations",
    roles: [STAFF_ROLE.RESTAURANT],
    items: [
      { id: "reservations", label: "Reservations", segment: "reservations", icon: "calendar" },
      { id: "tables", label: "Tables", segment: "tables", icon: "grid" },
      { id: "kds", label: "Kitchen Display", segment: "kds", icon: "fire" },
      { id: "payments", label: "Payments", segment: "payments", icon: "card" },
    ],
  },
  {
    group: "Attendance",
    roles: [STAFF_ROLE.RESTAURANT],
    items: [{ id: "shifts", label: "My shift", segment: "shifts", icon: "clock" }],
  },
];

export const FLAT_NAV = STAFF_NAV.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    roles: group.roles,
    group: group.group,
  }))
);

export function getNavForRole(role) {
  if (!role) return [];

  return STAFF_NAV
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: group.items,
    }));
}

export const VIEW_SUBTITLE = {
  tables:       "Floor map by area — check-in, reset, and QR session management",
  reservations: "Today's reservation queue — verify, assign tables, and check in guests",
  kds:          "Kitchen queue, ready items, and cooking status",
  payments:     "Collect payment, apply vouchers, and close table sessions",
  shifts:       "Attendance and shift revenue",
};

export function resolveActiveNavItem(pathname) {
  const segment = getStaffSegment(pathname);
  if (!segment) return null;

  return FLAT_NAV.find((item) => item.segment === segment) || null;
}
