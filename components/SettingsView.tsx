import React from 'react';
import { View, Settings } from '../types';
import Header from './Header';
import ToolboxIcon from './icons/ToolboxIcon';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onNavigate, onLogout }) => {
  return (
    <div className="flex flex-col h-full text-gray-800">
      <Header
        title="Einstellungen"
        onNavigate={onNavigate}
        onLogout={onLogout}
        showBackButton
        backTargetView={View.HOME}
      />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
            <ToolboxIcon className="w-6 h-6 mt-0.5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Konfiguration über Environment-Variablen</h2>
              <p className="text-sm">Webhook-URLs werden ausschließlich aus den Environment-Variablen gelesen. Die Chat-Webhook-URL ist im Admin-Bereich unter "Webhooks" einsehbar. Änderungen erfolgen über die .env-Datei bzw. System-Umgebung und erfordern ein Neu-Laden der App.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;