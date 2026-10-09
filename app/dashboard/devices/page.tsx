"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ShieldCheck,
  PlusCircle,
  Activity,
  Layers,
  X,
  Zap,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DataSourceCatalogItem {
  providerKey: string;
  displayName: string;
  category: "WEARABLE" | "GLUCOSE" | "BODY_SCALE";
  isConnected: boolean;
  isMock: boolean;
  lastSyncStatus: "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";
  lastSyncAt: string | null;
  errorMessage: string | null;
  description: string;
  isConfigured: boolean;
}

export default function DevicesPage() {
  const [sources, setSources] = useState<DataSourceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [connectModalProvider, setConnectModalProvider] = useState<DataSourceCatalogItem | null>(null);
  const [modalConsent, setModalConsent] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.dataSources) setSources(data.dataSources);
    } catch (err) {
      console.error("Fetch devices error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSyncProvider = async (providerKey: string) => {
    setSyncingKey(providerKey);
    try {
      await fetch(`/api/devices/${providerKey}/sync`, { method: "POST" });
      await fetchSources();
    } catch {
      // Handled
    } finally {
      setSyncingKey(null);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    if (!confirm(`Are you sure you want to disconnect ${providerKey}? Passive telemetry will be paused.`)) {
      return;
    }
    try {
      await fetch(`/api/devices/${providerKey}`, { method: "DELETE" });
      await fetchSources();
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleConfirmConnect = async () => {
    if (!connectModalProvider || !modalConsent) return;
    setConnecting(true);
    try {
      await fetch("/api/devices/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey: connectModalProvider.providerKey,
          scopes: ["activity", "heart_rate", "sleep", "glucose"],
        }),
      });
      setConnectModalProvider(null);
      setModalConsent(false);
      await fetchSources();
    } catch (err) {
      console.error("Connect error:", err);
    } finally {
      setConnecting(false);
    }
  };

  const connectedCount = sources.filter((s) => s.isConnected).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <SafetyBanner compact />

        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                Passive Hardware Integrations
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Connected Data Streams
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage background telemetry providers. Data flows automatically into your unified metabolic profile.
              </p>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-xs font-semibold text-teal-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{connectedCount} of {sources.length} Streams Active</span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Information Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Integration Transparency:</strong> Providers without production OAuth keys run in safe local simulation mode (DEMO DATA). You can connect or disconnect any source at any time with complete data sovereignty.
              </span>
            </div>
          </div>

          {/* Sources Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => {
              const isSyncing = syncingKey === src.providerKey || src.lastSyncStatus === "SYNCING";

              return (
                <div
                  key={src.providerKey}
                  className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between shadow-xs ${
                    src.isConnected
                      ? "border-slate-200/90 hover:border-teal-300"
                      : "border-slate-200/60 opacity-90"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {src.category}
                      </span>
                      {src.isConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Not Connected
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{src.displayName}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {src.description}
                      </p>
                    </div>

                    {/* Sync Status Badge */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Sync State:</span>
                      <span className="font-semibold text-slate-700">
                        {isSyncing
                          ? "Syncing..."
                          : src.isConnected
                          ? formatRelativeTime(src.lastSyncAt)
                          : "Inactive"}
                      </span>
                    </div>

                    {src.errorMessage && (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{src.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    {src.isConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(src.providerKey)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Disconnect</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={() => handleSyncProvider(src.providerKey)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConnectModalProvider(src);
                          setModalConsent(false);
                        }}
                        className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Connect Stream</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Connect Stream Modal with Explicit Consent */}
      {connectModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Connect {connectModalProvider.displayName}
                </h3>
              </div>
              <button
                onClick={() => setConnectModalProvider(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Authorizing <strong>{connectModalProvider.displayName}</strong> allows Pulse Health to collect passive background telemetry directly into your unified metabolic profile.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                <div className="font-semibold text-slate-900">Requested Data Scopes:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                  <li>Continuous heart rate and resting pulse</li>
                  <li>Daily step counts and active energy expenditure</li>
                  <li>Nocturnal sleep duration and sleep stage breakdown</li>
                  <li>Sensor rate-of-change and metabolic trend tags</li>
                </ul>
              </div>

              {/* Explicit non-preselected consent checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-teal-200 bg-teal-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalConsent}
                  onChange={(e) => setModalConsent(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <span className="text-[11px] text-teal-950 font-semibold leading-relaxed">
                  I explicitly authorize Pulse Health to collect and analyze telemetry from {connectModalProvider.displayName}. I can revoke this permission anytime.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConnectModalProvider(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!modalConsent || connecting}
                onClick={handleConfirmConnect}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Authorize & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
