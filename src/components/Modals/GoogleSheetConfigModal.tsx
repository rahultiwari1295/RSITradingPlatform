import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Users,
  ShieldCheck,
  Layers,
  ArrowRight
} from "lucide-react";
import type { GoogleSheetConfig, SheetStockQuote } from "../../types";

interface GoogleSheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetConfig | null;
  onSaveConfig: (config: Partial<GoogleSheetConfig>) => Promise<boolean>;
  onSyncNow: () => Promise<boolean>;
  isSyncing: boolean;
  quotes: SheetStockQuote[];
}

export default function GoogleSheetConfigModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSyncNow,
  isSyncing,
  quotes
}: GoogleSheetConfigModalProps) {
  const [sheetUrl, setSheetUrl] = useState(config?.sheetUrlOrId || "");
  const [sheetGid, setSheetGid] = useState(config?.sheetGid || "0");
  const [syncInterval, setSyncInterval] = useState(config?.syncIntervalSec || 15);
  const [isEnabled, setIsEnabled] = useState(config?.isEnabled ?? true);
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setSheetUrl(config.sheetUrlOrId || "");
      setSheetGid(config.sheetGid || "0");
      setSyncInterval(config.syncIntervalSec || 15);
      setIsEnabled(config.isEnabled);
    }
  }, [config]);

  if (!isOpen) return null;

  const sampleFormula = `=GOOGLEFINANCE(A2, "price")`;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(sampleFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setSaveStatus(null);

    const ok = await onSaveConfig({
      sheetUrlOrId: sheetUrl.trim(),
      sheetGid: sheetGid.trim() || "0",
      syncIntervalSec: Number(syncInterval),
      isEnabled
    });

    if (ok) {
      // Trigger instant sync test
      const syncOk = await onSyncNow();
      setIsTesting(false);
      if (syncOk) {
        setSaveStatus({
          type: "success",
          message: `Connected successfully! Cached ${quotes.length} live stock rows.`
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSaveStatus({
          type: "error",
          message: "Sheet saved, but data fetch encountered an issue. Make sure sheet is shared with 'Anyone with the link can view'."
        });
      }
    } else {
      setIsTesting(false);
      setSaveStatus({
        type: "error",
        message: "Failed to update configuration on server."
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#14161E] rounded-[24px] shadow-2xl border border-[#ECEEF2] dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#ECEEF2] dark:border-white/[0.08] bg-[#FAFAFC] dark:bg-[#1A1D26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16.5px] font-bold text-[#14151A] dark:text-white tracking-tight">
                  Google Sheets =GOOGLEFINANCE() Sync
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40 font-mono">
                  10,000+ USERS SAFE
                </span>
              </div>
              <p className="text-[11.5px] text-[#8B8D98]">
                Server-cached ingestion engine with sub-10ms multicast
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-[#8B8D98] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-[13px]">
          
          {/* Scalability Explainer Banner */}
          <div className="p-3.5 rounded-[16px] bg-[#EEF0FE] dark:bg-indigo-950/30 border border-[#818CF8]/30 flex items-start gap-3 text-[12px] text-[#56586A] dark:text-slate-300">
            <div className="w-7 h-7 rounded-[10px] bg-[#6366F1] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#14151A] dark:text-white">
                Why 1,000+ users will never encounter rate limits:
              </span>
              <p className="mt-0.5 text-[11.5px] leading-relaxed">
                The QuantSync backend fetches your sheet exactly <span className="font-bold text-[#6366F1] dark:text-indigo-300">once every {syncInterval} seconds</span> and caches prices in high-speed RAM. When 1,000+ users view your app simultaneously, they receive the cached quotes instantly from Node.js with <span className="font-bold text-[#16A34A]">zero additional calls to Google</span>.
              </p>
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider font-mono">
                  Google Sheet URL or Spreadsheet ID
                </label>
                <span className="text-[11px] text-[#8B8D98]">
                  Share permissions: "Anyone with the link can view"
                </span>
              </div>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
              />
              <p className="text-[11px] text-[#8B8D98] mt-1">
                Supports standard edit URLs, published web URLs, or direct spreadsheet IDs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Sheet Tab GID (Optional)
                </label>
                <input
                  type="text"
                  value={sheetGid}
                  onChange={(e) => setSheetGid(e.target.value)}
                  placeholder="0 (first tab)"
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Server Refresh Interval
                </label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-medium focus:outline-none focus:border-[#6366F1] cursor-pointer"
                >
                  <option value={10}>Every 10 Seconds (Ultra-Fast)</option>
                  <option value={15}>Every 15 Seconds (Recommended)</option>
                  <option value={30}>Every 30 Seconds (Balanced)</option>
                  <option value={60}>Every 1 Minute (Standard)</option>
                  <option value={120}>Every 2 Minutes (Low Bandwidth)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Sheet Setup Cheat Sheet */}
          <div className="p-3.5 rounded-[16px] bg-[#FAFAFC] dark:bg-white/[0.03] border border-[#ECEEF2] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#14151A] dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#16A34A]" /> Recommended Sheet Column Layout:
              </span>
              <button
                type="button"
                onClick={handleCopyFormula}
                className="text-[11px] font-bold text-[#6366F1] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedFormula ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedFormula ? "Copied!" : "Copy Formula"}</span>
              </button>
            </div>

            <div className="overflow-x-auto text-[11px] font-mono border border-[#ECEEF2] dark:border-white/10 rounded-[10px]">
              <table className="w-full text-left">
                <thead className="bg-[#F1F2F5] dark:bg-white/5 text-[#56586A] dark:text-slate-300">
                  <tr>
                    <th className="p-2">Col A (Symbol)</th>
                    <th className="p-2">Col B (Price)</th>
                    <th className="p-2">Col C (Change %)</th>
                    <th className="p-2">Col D (Day High)</th>
                    <th className="p-2">Col E (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEEF2] dark:divide-white/5 text-[#14151A] dark:text-slate-200">
                  <tr>
                    <td className="p-2 font-bold text-[#6366F1]">NSE:RELIANCE</td>
                    <td className="p-2 text-[#16A34A]">=GOOGLEFINANCE(A2, "price")</td>
                    <td className="p-2">=GOOGLEFINANCE(A2, "changepct")</td>
                    <td className="p-2">=GOOGLEFINANCE(A2, "high")</td>
                    <td className="p-2 font-bold">BUY</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#6366F1]">NSE:TCS</td>
                    <td className="p-2 text-[#16A34A]">=GOOGLEFINANCE(A3, "price")</td>
                    <td className="p-2">=GOOGLEFINANCE(A3, "changepct")</td>
                    <td className="p-2">=GOOGLEFINANCE(A3, "high")</td>
                    <td className="p-2 font-bold">HOLD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Message */}
          {saveStatus && (
            <div
              className={`p-3 rounded-[12px] text-[12px] font-bold flex items-center gap-2 ${
                saveStatus.type === "success"
                  ? "bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]"
                  : "bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]"
              }`}
            >
              {saveStatus.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#ECEEF2] dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsTesting(true);
                  await onSyncNow();
                  setIsTesting(false);
                }}
                disabled={isSyncing || isTesting}
                className="px-3.5 py-2 rounded-[12px] bg-[#F6F7F9] dark:bg-white/[0.06] hover:bg-[#EEF0FE] hover:text-[#6366F1] text-[#56586A] dark:text-slate-300 font-bold text-[12px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isTesting ? "animate-spin" : ""}`} />
                <span>Test Live Sync Now</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[12px] text-[12.5px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTesting || isSyncing}
                className="px-5 py-2.5 rounded-[12px] bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] font-bold text-[12.5px] flex items-center gap-2 shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save & Enable Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
