const isSingleSessionBookingType = (type) => ["activity", "cafe", "restaurant"].includes(type);

const calculateNights = (checkIn, checkOut) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((checkOut - checkIn) / dayMs);
  return diff > 0 ? diff : 1;
};

const buildPriceBreakdown = ({ unitPrice, nights, guests = 1 }) => {
  const numericGuests = Number(guests);
  const guestCount = Number.isFinite(numericGuests) && numericGuests > 0 ? numericGuests : 1;
  const subtotal = Number((unitPrice * nights * guestCount).toFixed(2));
  const serviceFee = Number((subtotal * 0.08).toFixed(2));
  const tax = Number((subtotal * 0.13).toFixed(2));
  const total = Number((subtotal + serviceFee + tax).toFixed(2));
  return { unitPrice, nights, guests: guestCount, subtotal, serviceFee, tax, total };
};

module.exports = {
  isSingleSessionBookingType,
  calculateNights,
  buildPriceBreakdown,
};
