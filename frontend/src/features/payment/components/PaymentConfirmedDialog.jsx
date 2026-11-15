import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';

export default function PaymentConfirmedDialog({ reference, onContinue }) {
  const { language } = useLanguage();
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="payment-confirmed-title"
      onCancel={event => { event.preventDefault(); onContinue(); }}
      className="m-auto w-[min(90vw,24rem)] rounded-2xl bg-white p-8 text-center text-stone-900 shadow-xl backdrop:bg-black/60">
      <CheckCircle2 aria-hidden="true" size={44} className="mx-auto mb-4 text-green-700" />
      <h2 id="payment-confirmed-title" className="text-2xl font-semibold">
        {language === 'vi' ? 'Đã thanh toán thành công' : 'Payment successful'}
      </h2>
      <p className="my-4">{language === 'vi' ? 'Mã giao dịch' : 'Payment reference'} · {reference}</p>
      <button autoFocus onClick={onContinue} className="rounded-full bg-stone-900 px-6 py-2 text-white">
        {language === 'vi' ? 'Tiếp tục' : 'Continue'}
      </button>
    </dialog>
  );
}
