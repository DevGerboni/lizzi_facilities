import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { BottomTabs, CenterLoading, DecorativeBackground, GhostButton, Message } from './src/components/ui';
import { APP_NAME } from './src/config/app';
import { api } from './src/lib/api';
import { clearSession, getStoredUser, setSession } from './src/lib/auth-storage';
import { LoginScreen } from './src/modules/auth/LoginScreen';
import { loginRequest, logoutRequest } from './src/modules/auth/api';
import { AgendaScreen } from './src/modules/agenda/AgendaScreen';
import { OSDetailScreen } from './src/modules/os/OSDetailScreen';
import { OSListScreen } from './src/modules/os/OSListScreen';
import { NewOSScreen } from './src/modules/os/NewOSScreen';
import { styles } from './src/theme/styles';
import type { OSItem, Tab, Usuario } from './src/types/mobile';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [tab, setTab] = useState<Tab>('os');
  const [lista, setLista] = useState<OSItem[]>([]);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [detalheId, setDetalheId] = useState<number | null>(null);

  useEffect(() => {
    getStoredUser()
      .then(setUsuario)
      .finally(() => setIniciando(false));
  }, []);

  async function login() {
    setErro('');
    setMsg('');
    setCarregando(true);

    try {
      const data = await loginRequest(email, senha);
      await setSession(data.token, data.usuario);
      setUsuario(data.usuario);
      setSenha('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    await logoutRequest();
    await clearSession();
    setUsuario(null);
    setLista([]);
    setDetalheId(null);
    setErro('');
    setMsg('');
    setStatusFiltro('');
  }

  async function carregarLista() {
    if (!usuario) return;

    setErro('');
    try {
      const qs = statusFiltro ? '?status=' + encodeURIComponent(statusFiltro) : '';
      const data = await api<OSItem[]>('/os/os_listar.php' + qs);
      setLista(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.message.includes('sessão expirou')) {
        setUsuario(null);
      }
    }
  }

  useEffect(() => {
    carregarLista();
  }, [usuario?.id, statusFiltro]);

  const agenda = useMemo(
    () =>
      lista
        .filter((os) => os.data_agendada && !['concluido', 'cancelado'].includes(os.status))
        .sort(
          (a, b) =>
            String(a.data_agendada).localeCompare(String(b.data_agendada)) ||
            String(a.hora_agendada || '').localeCompare(String(b.hora_agendada || '')),
        ),
    [lista],
  );

  const tituloAtual =
    detalheId !== null
      ? 'Detalhes da OS'
      : tab === 'agenda'
        ? 'Agenda técnica'
        : tab === 'nova'
          ? 'Nova ordem de serviço'
          : 'Painel de atendimento';

  if (iniciando) return <CenterLoading />;

  if (!usuario) {
    return (
      <LoginScreen
        email={email}
        senha={senha}
        erro={erro}
        carregando={carregando}
        setEmail={setEmail}
        setSenha={setSenha}
        onLogin={login}
      />
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <DecorativeBackground />
      <StatusBar style="light" />
      <View style={styles.topbar}>
        <View style={styles.topbarCard}>
          <View style={styles.topbarMeta}>
            <Text style={styles.topBrand}>{APP_NAME}</Text>
            <Text style={styles.topTitle}>{tituloAtual}</Text>
            <Text style={styles.topUser}>{usuario.nome}</Text>
          </View>
          <View>
            <View style={styles.topPill}>
              <Text style={styles.topPillText}>{usuario.plano === 'premium' ? 'Premium' : 'Essencial'}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <GhostButton label="Sair" onPress={sair} inverted />
            </View>
          </View>
        </View>
      </View>

      {!!erro && <Message type="erro" text={erro} />}
      {!!msg && <Message type="ok" text={msg} />}

      {detalheId ? (
        <OSDetailScreen
          id={detalheId}
          premium={usuario.plano === 'premium'}
          perfil={usuario.perfil}
          voltar={() => {
            setDetalheId(null);
            carregarLista();
          }}
          setErro={setErro}
          setMsg={setMsg}
        />
      ) : (
        <>
          {tab === 'os' && (
            <OSListScreen
              lista={lista}
              statusFiltro={statusFiltro}
              setStatusFiltro={setStatusFiltro}
              abrir={setDetalheId}
              atualizar={carregarLista}
            />
          )}
          {tab === 'agenda' && <AgendaScreen lista={agenda} abrir={setDetalheId} atualizar={carregarLista} />}
          {tab === 'nova' && (
            <NewOSScreen
              premium={usuario.plano === 'premium'}
              abrir={(id) => {
                setDetalheId(id);
                carregarLista();
              }}
              setErro={setErro}
              setMsg={setMsg}
            />
          )}
        </>
      )}

      {!detalheId && <BottomTabs tab={tab} setTab={setTab} />}
    </SafeAreaView>
  );
}
