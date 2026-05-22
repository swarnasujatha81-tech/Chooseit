import { Languages } from 'lucide-react';
import { languageOptions } from '@/data';
import { useLanguage } from '@/components/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switcher">
      <Languages size={15} />
      {languageOptions.map((item) => (
        <button key={item.code} className={language === item.code ? 'active' : ''} onClick={() => setLanguage(item.code)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
