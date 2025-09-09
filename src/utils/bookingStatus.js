// src/utils/bookingStatus.js
// src/utils/bookingStatus.js
export const BOOKING = {
  PENDING: "pending",
  APPROVED: "approved",
  APPROVED_PAID: "approved_paid",
  PAID: "paid",
  DECLINED: "declined",
};

export const PAID_STATUSES = [BOOKING.PAID, BOOKING.APPROVED_PAID];
export const isPaid = (s) => PAID_STATUSES.includes(s);
export const isApproved = (s) => s === BOOKING.APPROVED;
export const isPending = (s) => s === BOOKING.PENDING;
export const isDeclined = (s) => s === BOOKING.DECLINED;
