import { apiPost } from '@/core/api/httpClient.js';

export function tablePaymentHeaders(token) {
  return token ? { 'X-Table-Token': token } : {};
}

export function startOrderPayment(orderId, token) {
  return apiPost(`/payments/orders/${orderId}/start-payment`, {}, { headers:tablePaymentHeaders(token) });
}
