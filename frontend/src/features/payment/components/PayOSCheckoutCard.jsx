import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiPost } from '@/core/api/httpClient.js';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';

function PayOSCheckoutContent({kind='order',targetId,accessToken,tableToken,amount,onSuccess,onCreated}) {
  const {language}=useLanguage();
  const vi=language==='vi';
  const [payment,setPayment]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const notified=useRef(false);
  const onSuccessRef=useRef(onSuccess);
  useEffect(()=>{onSuccessRef.current=onSuccess;},[onSuccess]);
  const headers=tableToken ? {'X-Table-Token':tableToken} : {};
  const target={kind,targetId,accessToken};
  async function check(reconcile=false){
    if(!payment)return;
    const response=await apiPost(`/payments/payos/payment-links/${payment.orderCode}/status`,{accessToken,reconcile},{headers});
    if(response.data?.status==='Completed' && !notified.current){
      notified.current=true;setPayment(response.data);onSuccessRef.current?.();
    }
    return response;
  }
  useEffect(()=>{
    if(!payment?.orderCode || payment.status==='Completed')return;
    let active=true;
    const timer=setInterval(async()=>{
      try{
        const response=await apiPost(`/payments/payos/payment-links/${payment.orderCode}/status`,{accessToken},{headers:tableToken ? {'X-Table-Token':tableToken} : {}});
        if(active && response.data?.status==='Completed' && !notified.current){
          notified.current=true;setPayment(response.data);onSuccessRef.current?.();
        }
      }catch{ /* An explicit status check below reports connection errors. */ }
    },3000);
    return()=>{active=false;clearInterval(timer);};
  },[payment?.orderCode,payment?.status,accessToken,tableToken]);

  async function create(){
    setBusy(true);setError('');
    try{const response=await apiPost('/payments/payos/payment-links',target,{headers});setPayment(response.data);onCreated?.(response.data);}
    catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function checkNow(){
    setBusy(true);setError('');
    try{await check(true);}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section aria-label={vi?'Thanh toán payOS':'payOS payment'} style={{padding:20,border:'1px solid #dedbd4',borderRadius:16,background:'#fff',color:'#28251f'}}>
    <h3 style={{margin:'0 0 8px'}}>payOS</h3>
    <p>{vi?'Quét QR bằng ứng dụng ngân hàng. Hệ thống tự xác nhận khi nhận được thanh toán.':'Scan with your banking app. Payment is confirmed automatically.'}</p>
    {!payment ? <>
      <p style={{fontWeight:700}}>{Math.round(Number(amount)||0).toLocaleString('vi-VN')} VND</p>
      <button type="button" disabled={busy||!targetId||Number(amount)<=0} onClick={create} className="pay-btn-cancel" style={{background:'#fff',color:'#222',border:'1px solid #bbb',padding:'12px 20px',borderRadius:8}}>
        {busy ? (vi?'Đang tạo mã QR…':'Creating QR…') : (vi?'Tạo mã thanh toán payOS':'Create payOS payment')}
      </button>
    </> : <>
      {payment.qrCode && <div style={{background:'#fff',padding:12,display:'inline-block',maxWidth:'100%'}}><QRCodeSVG value={payment.qrCode} size={220} style={{maxWidth:'100%',height:'auto'}} /></div>}
      <p style={{fontWeight:700,fontSize:22}}>{Number(payment.amount).toLocaleString('vi-VN')} VND</p>
      <p>{payment.accountName} · {payment.accountNumber}</p>
      <p>{vi?'Mã thanh toán':'Payment code'}: {payment.orderCode}</p>
      <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',padding:12,border:'1px solid #bbb',borderRadius:8}}>{vi?'Mở trang thanh toán payOS':'Open payOS checkout'}</a>
      <button type="button" disabled={busy} onClick={checkNow} style={{padding:12,margin:8,border:'1px solid #bbb',borderRadius:8}}>{vi?'Kiểm tra thanh toán':'Check payment'}</button>
      <p role="status">{payment.status==='Completed' ? (vi?'Đã xác nhận thanh toán.':'Payment confirmed.') : (vi?'Đang chờ thanh toán. Nếu đã chuyển tiền, không thanh toán lại.':'Awaiting payment. If you have paid, do not pay again.')}</p>
    </>}
    {error && <p role="alert" style={{color:'#b42318'}}>{error}</p>}
  </section>;
}
export default function PayOSCheckoutCard(props){
  return <PayOSCheckoutContent key={`${props.kind || 'order'}:${props.targetId}:${props.amount}`} {...props} />;
}
