export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // fallback if string is not standard ISO
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(date);
};
