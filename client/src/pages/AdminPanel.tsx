import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Users, Key, History, LogOut, Menu, X } from "lucide-react";

export default function AdminPanel() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [activeTab, setActiveTab] = useState("resellers");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Create reseller form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState("0");

  // Add keys form
  const [keyType, setKeyType] = useState<"1day" | "7days" | "30days">("1day");
  const [keysText, setKeysText] = useState("");

  // Credit management
  const [selectedResellerId, setSelectedResellerId] = useState<number | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOperation, setCreditOperation] = useState<"add" | "remove" | "set">("add");

  // Queries
  const resellersList = trpc.admin.listResellers.useQuery();
  const transactionsList = trpc.admin.listTransactions.useQuery({ limit: 100 });

  // Mutations
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Revendedor criado com sucesso!");
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewCredits("0");
      resellersList.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar revendedor");
    },
  });

  const addKeysMutation = trpc.admin.addKeysToStock.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} chaves adicionadas com sucesso!`);
      setKeysText("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar chaves");
    },
  });

  const updateCreditsMutation = trpc.admin.updateResellerCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`Créditos atualizados! Novo saldo: ${data.newCredits}`);
      setCreditAmount("");
      setSelectedResellerId(null);
      resellersList.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar créditos");
    },
  });

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      username: newUsername,
      password: newPassword,
      name: newName,
      credits: newCredits,
    });
  };

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const keys = keysText
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keys.length === 0) {
      toast.error("Por favor, adicione pelo menos uma chave");
      return;
    }

    addKeysMutation.mutate({ type: keyType, keys });
  };

  const handleUpdateCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResellerId || !creditAmount) {
      toast.error("Selecione um revendedor e informe o valor");
      return;
    }

    updateCreditsMutation.mutate({
      userId: selectedResellerId,
      creditAmount,
      operation: creditOperation,
    });
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-red-500">Acesso negado. Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const menuItems = [
    { id: "resellers", label: "Revendedores", icon: Users },
    { id: "credits", label: "Gerenciar Créditos", icon: Key },
    { id: "stock", label: "Estoque de Keys", icon: Key },
    { id: "transactions", label: "Transações", icon: History },
  ];

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
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-700">
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
            <h2 className="text-3xl font-bold text-white">Painel Administrativo</h2>
            <p className="text-slate-400 text-sm mt-1">Bem-vindo, {user.name || user.username}</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 pb-20">
          {/* Revendedores */}
          {activeTab === "resellers" && (
            <div className="space-y-6">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Criar Novo Revendedor</h3>
                <form onSubmit={handleCreateReseller} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Usuário</label>
                      <Input
                        type="text"
                        placeholder="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        disabled={registerMutation.isPending}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                      <Input
                        type="password"
                        placeholder="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={registerMutation.isPending}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                      <Input
                        type="text"
                        placeholder="Nome do revendedor"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={registerMutation.isPending}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Créditos Iniciais</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newCredits}
                        onChange={(e) => setNewCredits(e.target.value)}
                        disabled={registerMutation.isPending}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending || !newUsername || !newPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {registerMutation.isPending ? "Criando..." : "Criar Revendedor"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Revendedores Ativos</h3>
                {resellersList.isLoading ? (
                  <p className="text-slate-400">Carregando...</p>
                ) : resellersList.data && resellersList.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resellersList.data.map((reseller: any) => (
                      <div
                        key={reseller.id}
                        className="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                      >
                        <p className="text-white font-semibold">{reseller.name}</p>
                        <p className="text-slate-400 text-sm">@{reseller.username}</p>
                        <p className="text-blue-400 font-bold mt-2">{reseller.credits} créditos</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">Nenhum revendedor criado ainda</p>
                )}
              </Card>
            </div>
          )}

          {/* Gerenciar Créditos */}
          {activeTab === "credits" && (
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Gerenciar Créditos de Revendedores</h3>
              <form onSubmit={handleUpdateCredits} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Selecionar Revendedor</label>
                  <select
                    value={selectedResellerId || ""}
                    onChange={(e) => setSelectedResellerId(parseInt(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="">-- Selecione um revendedor --</option>
                    {resellersList.data?.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (@{r.username}) - {r.credits} créditos
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Operação</label>
                    <select
                      value={creditOperation}
                      onChange={(e) => setCreditOperation(e.target.value as any)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                    >
                      <option value="add">Adicionar</option>
                      <option value="remove">Remover</option>
                      <option value="set">Definir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      disabled={updateCreditsMutation.isPending}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updateCreditsMutation.isPending || !selectedResellerId || !creditAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {updateCreditsMutation.isPending ? "Atualizando..." : "Atualizar Créditos"}
                </Button>
              </form>
            </Card>
          )}

          {/* Estoque de Keys */}
          {activeTab === "stock" && (
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Adicionar Keys ao Estoque</h3>
              <form onSubmit={handleAddKeys} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Key</label>
                  <select
                    value={keyType}
                    onChange={(e) => setKeyType(e.target.value as any)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="1day">1 Dia (1 crédito)</option>
                    <option value="7days">7 Dias (2 créditos)</option>
                    <option value="30days">30 Dias (4 créditos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Keys (uma por linha)</label>
                  <textarea
                    placeholder="key1&#10;key2&#10;key3"
                    value={keysText}
                    onChange={(e) => setKeysText(e.target.value)}
                    disabled={addKeysMutation.isPending}
                    rows={8}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 font-mono text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={addKeysMutation.isPending || keysText.trim().length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {addKeysMutation.isPending ? "Adicionando..." : "Adicionar Keys"}
                </Button>
              </form>
            </Card>
          )}

          {/* Transações */}
          {activeTab === "transactions" && (
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Histórico de Transações</h3>
              {transactionsList.isLoading ? (
                <p className="text-slate-400">Carregando...</p>
              ) : transactionsList.data && transactionsList.data.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactionsList.data.map((tx: any) => (
                    <div key={tx.id} className="p-3 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                      <p className="text-white font-semibold">{tx.description}</p>
                      <p className="text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Nenhuma transação registrada</p>
              )}
            </Card>
          )}
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
