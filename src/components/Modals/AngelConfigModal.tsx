import React, { useState } from "react";
import { X, Key, ShieldCheck, Zap, ExternalLink, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface AngelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, clientCode: string, feedToken: string, jwtToken?: string) => Promise<boolean>;
  currentStatus: {
    isEnabled: boolean;
    connectionState: string;
    lastError?: string;
  };
}

export default function AngelConfigModal({
  isOpen,
  onClose,
  onSave,
  currentStatus
}: AngelConfigModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [feedToken, setFeedToken] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !clientCode || !feedToken) {
      setStatusMsg({ type: "error", text: "Please provide API Key, Client Code, and Feed Token." });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const success = await onSave(apiKey.trim(), clientCode.trim(), feedToken.trim(), jwtToken.trim() || undefined);
    setIsSaving(false);

    if (success) {
      setStatusMsg({ type: "success", text: "Connected! SmartAPI WebSocket stream initiated." });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setStatusMsg({ type: "error", text: "Failed to connect to Angel One SmartAPI socket. Check credentials." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#14161E] rounded-[24px] shadow-2xl border border-[#ECEEF2] dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#ECEEF2] dark:border-white/[0.08] bg-[#FAFAFC] dark:bg-[#1A1D26]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#14151A] dark:text-white tracking-tight">
                Angel One SmartAPI WebSocket
              </h2>
              <p className="text-[11.5px] text-[#8B8D98]">
                Stream live tick-by-tick NSE/BSE quotes directly from Angel One
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Current Connection Banner */}
          <div className="p-3.5 rounded-[16px] bg-[#F6F7F9] dark:bg-white/[0.04] border border-[#ECEEF2] dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentStatus.connectionState === "CONNECTED"
                    ? "bg-[#16A34A] animate-pulse"
                    : currentStatus.connectionState === "CONNECTING"
                    ? "bg-amber-400 animate-ping"
                    : "bg-[#8B8D98]"
                }`}
              />
              <div>
                <div className="text-[12px] font-bold text-[#14151A] dark:text-white">
                  Status: {currentStatus.connectionState || "STANDBY"}
                </div>
                <div className="text-[11px] text-[#8B8D98]">
                  {currentStatus.connectionState === "CONNECTED"
                    ? "Streaming live ticks from Angel One SmartStream"
                    : "Using high-frequency fallback tick engine"}
                </div>
              </div>
            </div>
            <a
              href="https://smartapi.angelbroking.com"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-[#6366F1] hover:underline flex items-center gap-1 shrink-0"
            >
              SmartAPI Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. your_smartapi_key_here"
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Client Code
                </label>
                <input
                  type="text"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  placeholder="e.g. R129500"
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Feed Token
                </label>
                <input
                  type="password"
                  value={feedToken}
                  onChange={(e) => setFeedToken(e.target.value)}
                  placeholder="e.g. feed_token_string"
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
                JWT / Auth Token (Optional)
              </label>
              <input
                type="password"
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                placeholder="Bearer JWT token if generated via TOTP"
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white dark:bg-[#0E0F14] border border-[#ECEEF2] dark:border-white/10 text-[13px] text-[#14151A] dark:text-white font-mono focus:outline-none focus:border-[#6366F1]"
              />
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-3 rounded-[14px] bg-[#EEF0FE] dark:bg-indigo-950/30 border border-[#818CF8]/20 text-[11.5px] text-[#56586A] dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-[#6366F1] dark:text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> How it works:
            </div>
            <p>
              1. Get your free API Key from <span className="font-bold">smartapi.angelbroking.com</span>.
            </p>
            <p>
              2. Generate your session Feed Token using your Angel One Client PIN & TOTP.
            </p>
            <p>
              3. The app server connects directly to Angel One's WebSocket and multicasts ticks to your screen in sub-10ms.
            </p>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-[12px] text-[12px] font-bold flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]"
                  : "bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[12px] text-[12.5px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-[12px] bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] font-bold text-[12.5px] flex items-center gap-2 shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  Connect SmartAPI Stream
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
