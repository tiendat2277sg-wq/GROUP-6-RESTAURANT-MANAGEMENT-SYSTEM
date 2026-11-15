import { useState, useEffect } from 'react';
import { apiGet } from '@/core/api/httpClient';
import { tablePaymentHeaders } from '../orderPayment';

export default function usePaymentPolling(orderId, token) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let timer;
    async function poll() {
      try {
        const response = await apiGet(`/payments/orders/${orderId}/status`, {headers:tablePaymentHeaders(token)});
        if (!active || !response) return;
        const status = response.data.status;
        setResult({orderId,token,status});
        if (['Paid','Completed','Cancelled'].includes(status)) return;
      } catch (error) {
        if (!active) return;
        setResult({orderId,token,error:error.message});
        if ([401,403,404].includes(error.status)) return;
      }
      timer = setTimeout(poll, 3000);
    }
    poll();
    return () => { active=false; clearTimeout(timer); };
  }, [orderId, token]);
  return result?.orderId === orderId && result?.token === token ? result : {};
}
