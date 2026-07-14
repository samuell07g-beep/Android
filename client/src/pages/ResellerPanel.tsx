import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Copy, Check, LogOut, Menu, X, Zap, History } from "lucide-react";

export default function ResellerPanel() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Queries
  const profile = trpc.reseller.getProfile.useQuery();
  const keyStock = trpc.reseller.getKeyStock.useQuery();
  const transactions = trpc.reseller.listMyTransactions.useQuery({ limit: 50 });

  // Mutations
  const generateKeysMutation = trpc.reseller.generateKeys.useMutation({
    onSuccess: (data) => {
      setGeneratedKeys(data.keys);
      toast.success(`${data.keys.length} chaves geradas com sucesso!`);
      profile.refetch();
      keyStock.refetch();
      transactions.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar chaves");
    },
  });

  const handleGenerateKeys = (type: "1day" | "7days" | "30days", quantity: number) => {
    generateKeysMutation.mutate({ type, quantity });
  };

  const handleCopyAll = () => {
    const text = generatedKeys.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("Chaves copiadas para a área de transferência!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (!user || user.role === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-red-500">Acesso negado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col fixed h-screen left-0 top-0 z-40`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-xl font-bold text-white">PKM</h1>
              <p className="text-xs text-slate-400">Revendedor</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Saldo Card */}
        <div className="p-4 m-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
          {sidebarOpen ? (
            <div>
              <p className="text-blue-100 text-xs font-semibold">Saldo</p>
              <p className="text-2xl font-bold text-white mt-1">{profile.data?.credits || "0"}</p>
              <p className="text-blue-100 text-xs mt-1">créditos disponíveis</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{profile.data?.credits || "0"}</p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="mt-auto p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 transition-all duration-200"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? "ml-64" : "ml-20"} flex-1 transition-all duration-300`}>
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 shadow-lg sticky top-0 z-30">
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-white">Painel do Revendedor</h2>
            <p className="text-slate-400 text-sm mt-1">Bem-vindo, {user.name || user.username}!</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 pb-20">
          {/* Keys Available Grid */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Gerar Chaves</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {keyStock.data?.map((stock: any, index: number) => {
                const typeLabels: Record<string, { label: string; days: string }> = {
                  "1day": { label: "1 Dia", days: "24 horas" },
                  "7days": { label: "7 Dias", days: "1 semana" },
                  "30days": { label: "30 Dias", days: "1 mês" },
                };

                const typeInfo = typeLabels[stock.type];

                return (
                  <Card
                    key={stock.type}
                    className="p-6 bg-slate-800 border-slate-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white">{typeInfo.label}</h4>
                        <p className="text-slate-400 text-sm">{typeInfo.days}</p>
                      </div>
                      <Zap className="text-yellow-400" size={24} />
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="bg-slate-700 rounded-lg p-3">
                        <p className="text-slate-400 text-xs font-semibold mb-1">CUSTO</p>
                        <p className="text-green-400 text-2xl font-bold">{stock.costInCredits}</p>
                        <p className="text-slate-500 text-xs">créditos</p>
                      </div>

                      <div className="bg-slate-700 rounded-lg p-3">
                        <p className="text-slate-400 text-xs font-semibold mb-1">DISPONÍVEL</p>
                        <p className="text-blue-400 text-2xl font-bold">{stock.availableCount}</p>
                        <p className="text-slate-500 text-xs">chaves em estoque</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleGenerateKeys(stock.type, 1)}
                      disabled={
                        generateKeysMutation.isPending ||
                        stock.availableCount === 0 ||
                        (profile.data?.credits || 0) < stock.costInCredits
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 active:scale-95"
                    >
                      {generateKeysMutation.isPending ? "Gerando..." : "Gerar 1 Chave"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Generated Keys */}
          {generatedKeys.length > 0 && (
            <Card className="p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-600/50 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">✅ Chaves Geradas com Sucesso!</h3>
                  <p className="text-green-300 text-sm mt-1">{generatedKeys.length} chave(s) pronta(s) para uso</p>
                </div>
                <Button
                  onClick={handleCopyAll}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 transition-all duration-200 active:scale-95"
                >
                  {copiedAll ? (
                    <>
                      <Check size={16} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copiar Tudo
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-700">
                <div className="space-y-2">
                  {generatedKeys.map((key, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-800 rounded text-slate-200 font-mono text-sm break-all hover:bg-slate-700 transition-colors border border-slate-600 animate-in fade-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {key}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-yellow-300 text-sm mt-4 flex items-center gap-2">
                <span>⚠️</span> Estas chaves são visíveis apenas para você. Copie-as agora!
              </p>
            </Card>
          )}

          {/* Transactions */}
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <History size={24} className="text-blue-400" />
              <h3 className="text-xl font-bold text-white">Histórico de Gerações</h3>
            </div>
            {transactions.isLoading ? (
              <p className="text-slate-400">Carregando...</p>
            ) : transactions.data && transactions.data.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.data.map((tx: any, index: number) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors border border-slate-600 animate-in fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{tx.description}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {tx.creditAmount && (
                        <p className="text-red-400 font-bold text-sm">-{tx.creditAmount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Nenhuma geração registrada</p>
            )}
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-400 text-sm">
          <p>Sistema desenvolvido por ruanzada7</p>
        </div>
      </div>
    </div>
  );
}
