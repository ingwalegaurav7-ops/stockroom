import { format as formatDate, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  try {
    return formatDate(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return '-';
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    return formatDate(new Date(dateStr), 'dd MMM yyyy, HH:mm');
  } catch {
    return '-';
  }
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '-';
  }
}

export function getStockStatus(currentStock, reorderLevel) {
  if (currentStock === 0) return 'OUT_OF_STOCK';
  if (currentStock <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function getStockStatusLabel(status) {
  switch (status) {
    case 'IN_STOCK': return 'In Stock';
    case 'LOW_STOCK': return 'Low Stock';
    case 'OUT_OF_STOCK': return 'Out of Stock';
    default: return status;
  }
}

export function getOrderStatusLabel(status) {
  switch (status) {
    case 'DRAFT': return 'Draft';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    default: return status;
  }
}

export function getMovementTypeLabel(type) {
  switch (type) {
    case 'RECEIPT': return 'Receipt';
    case 'SALE': return 'Sale';
    case 'RESTOCK': return 'Restock';
    case 'ADJUSTMENT': return 'Adjustment';
    default: return type;
  }
}

export function getRestockStatusLabel(status) {
  switch (status) {
    case 'REQUESTED': return 'Awaiting Approval';
    case 'APPROVED': return 'Approved';
    case 'AWAITING_DELIVERY': return 'Awaiting Delivery';
    case 'RECEIVED': return 'Received';
    case 'CANCELLED': return 'Cancelled';
    default: return status;
  }
}

export function truncate(text, maxLength = 30) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

export function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${random}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}