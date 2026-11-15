import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
function AdminDashboard() {
  const { translateLabel } = useLanguage();
  return (
    <main>
      <h1>{translateLabel("Admin Dashboard")}</h1>
    </main>
  );
}

export default AdminDashboard;
