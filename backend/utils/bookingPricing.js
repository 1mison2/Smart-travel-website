const isSingleSessionBookingType = (type) => ["activity", "cafe", "restaurant"].includes(type);

const calculateNights = (checkIn, checkOut) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((checkOut - checkIn) / dayMs);
  return diff > 0 ? diff : 1;
};

const buildPriceBreakdown = ({ unitPrice, nights }) => {
  const subtotal = Number((unitPrice * nights).toFixed(2));
  const serviceFee = Number((subtotal * 0.08).toFixed(2));
  const tax = Number((subtotal * 0.13).toFixed(2));
  const total = Number((subtotal + serviceFee + tax).toFixed(2));
  return { unitPrice, nights, subtotal, serviceFee, tax, total };
};

module.exports = {
  isSingleSessionBookingType,
  calculateNights,
  buildPriceBreakdown,
};
