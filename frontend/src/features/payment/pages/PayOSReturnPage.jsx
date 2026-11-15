import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
export default function PayOSReturnPage(){
  const {language}=useLanguage();
  return <main style={{maxWidth:560,margin:'80px auto',padding:24}}><h1>FUKU · payOS</h1>
    <p>{language==='vi'?'Bạn có thể quay lại cửa sổ FUKU ban đầu. Hệ thống sẽ hiển thị kết quả khi xác minh thanh toán với payOS.':'Return to your original FUKU window. The payment result appears after verification with payOS.'}</p>
    <button type="button" onClick={()=>window.close()}>{language==='vi'?'Đóng cửa sổ':'Close window'}</button>
  </main>;
}
