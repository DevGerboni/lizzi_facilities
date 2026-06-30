import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { StatusBar } from 'expo-status-bar';
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

const API_BASE = 'https://alexios.com.br/app_lizzi_fa/app_lizzi_fa';
const TOKEN_KEY = 'lizzi_token';
const USER_KEY = 'lizzi_user';

type Tab = 'os' | 'agenda' | 'nova';
type AssinaturaTipo = 'tecnico' | 'cliente';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  plano?: string | null;
}

interface Opcao { id: number; nome: string; }
interface Piso extends Opcao { unidade_id: number; }
interface Local extends Opcao { unidade_id: number; piso_id: number; }
interface Tecnico extends Opcao { unidades?: number[]; }
interface Categoria extends Opcao { tipo: string; }
interface Ativo extends Opcao { unidade_id: number; piso_id: number; local_id: number; categoria_id?: number | null; qr_code?: string | null; }

interface OSItem {
  id: number;
  codigo: string;
  status: string;
  tipo_os: string;
  prioridade: string;
  unidade_nome: string | null;
  piso_nome: string | null;
  local_nome: string | null;
  ativo_nome: string | null;
  tecnico_nome: string | null;
  solicitante_nome?: string | null;
  data_agendada: string | null;
  hora_agendada: string | null;
  created_at: string;
}

interface ChecklistResp {
  id: number;
  checklist_item_id: number;
  descricao: string;
  marcado: boolean | string;
  observacao: string | null;
  imagem_url: string | null;
}

interface ChecklistItem {
  id: number;
  descricao: string;
  obrigatorio: boolean | string;
  exige_foto: boolean | string;
  exige_observacao: boolean | string;
  ordem: number;
}

interface ChecklistModelo {
  id: number;
  nome: string;
  itens: ChecklistItem[];
}

interface OSDetalheData extends OSItem {
  ativo_id: number | null;
  ativo_categoria_id: number | null;
  avaria: string | null;
  descricao: string | null;
  observacao: string | null;
  inicio_atendimento: string | null;
  fim_atendimento: string | null;
  tempo_total_minutos: number | null;
  assinatura_tecnico_url: string | null;
  assinatura_cliente_url: string | null;
  checklist: ChecklistResp[];
}

const STATUS = ['aberto', 'em_andamento', 'interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'];
const PRIORIDADES = [
  ['baixa', 'Baixa'],
  ['media', 'Média'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente'],
];

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Atribuído',
  em_andamento: 'Em execução',
  interrompido: 'Interrompido',
  aguardando_aprovacao: 'Aguardando aprovação do cliente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  aberto: '#2563eb',
  em_andamento: '#d97706',
  interrompido: '#dc2626',
  aguardando_aprovacao: '#7c3aed',
  concluido: '#16a34a',
  cancelado: '#64748b',
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function rotuloStatus(status: string): string {
  return STATUS_LABEL[status] || status;
}

function rotuloPrioridade(prioridade: string): string {
  return PRIORIDADE_LABEL[prioridade] || prioridade;
}

function localOs(os: Pick<OSItem, 'unidade_nome' | 'piso_nome' | 'local_nome' | 'ativo_nome'>): string {
  return [os.unidade_nome, os.piso_nome, os.local_nome].filter(Boolean).join(' / ') || os.ativo_nome || '-';
}

function dataHora(data?: string | null, hora?: string | null): string {
  if (!data) return '-';
  const texto = [data, hora].filter(Boolean).join(' ');
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return texto;
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

function dataHoraCompleta(valor?: string | null): string {
  if (!valor) return '-';
  const texto = String(valor).trim();
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)/);
  if (!m) return dataHora(texto);
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6] || '00'}`;
}

function minutosHHMM(valor?: number | string | null): string {
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) return '-';
  const min = Math.max(0, Math.round(Number(valor)));
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function minutosExecucao(os: Pick<OSDetalheData, 'status' | 'inicio_atendimento' | 'fim_atendimento' | 'tempo_total_minutos'>): number | null {
  if (os.tempo_total_minutos !== null && os.tempo_total_minutos > 0 && os.status !== 'em_andamento') return os.tempo_total_minutos;
  if (!os.inicio_atendimento) return os.tempo_total_minutos;
  const inicio = new Date(String(os.inicio_atendimento).replace(' ', 'T')).getTime();
  if (Number.isNaN(inicio)) return os.tempo_total_minutos;
  const fimTexto = os.status === 'em_andamento' ? null : os.fim_atendimento;
  const fim = fimTexto ? new Date(String(fimTexto).replace(' ', 'T')).getTime() : Date.now();
  if (Number.isNaN(fim) || fim < inicio) return os.tempo_total_minutos ?? 0;
  const intervalo = Math.ceil((fim - inicio) / 60000);
  return Math.max(intervalo > 0 ? 1 : 0, os.tempo_total_minutos ?? 0);
}

function podeMudarEstado(atual: string, destino: string): boolean {
  if (atual === destino) return false;
  if (['concluido', 'cancelado'].includes(atual)) return false;
  if (destino === 'cancelado') return true;
  if (atual === 'aberto') return destino === 'em_andamento';
  if (atual === 'em_andamento') return ['interrompido', 'aguardando_aprovacao'].includes(destino);
  if (atual === 'interrompido') return destino === 'em_andamento';
  if (atual === 'aguardando_aprovacao') return destino === 'concluido';
  return false;
}

function rotuloBotaoEstado(atual: string, destino: string): string {
  if (atual === 'aberto' && destino === 'em_andamento') return 'Iniciar';
  if (atual === 'interrompido' && destino === 'em_andamento') return 'Retomar';
  return rotuloStatus(destino);
}

async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem(TOKEN_KEY)) || '';
}

async function setSession(token: string, usuario: Usuario): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

async function api<T>(path: string, options: { method?: string; body?: unknown; isForm?: boolean } = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = 'Bearer ' + token;

  let body: BodyInit | undefined;
  if (options.isForm) {
    body = options.body as BodyInit;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method: options.method || 'GET', headers, body });
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* sem json */ }

  if (res.status === 401) {
    await clearSession();
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  if (!res.ok) throw new Error(json?.message || 'Não foi possível concluir a ação.');

  return (json && json.data !== undefined ? json.data : json) as T;
}

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
    AsyncStorage.getItem(USER_KEY)
      .then((u) => { if (u) setUsuario(JSON.parse(u)); })
      .finally(() => setIniciando(false));
  }, []);

  async function login() {
    setErro('');
    setCarregando(true);
    try {
      const data = await api<{ token: string; usuario: Usuario }>('/login.php', {
        method: 'POST',
        body: { email: email.trim(), senha },
      });
      await setSession(data.token, data.usuario);
      setUsuario(data.usuario);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    await clearSession();
    setUsuario(null);
    setLista([]);
    setDetalheId(null);
  }

  async function carregarLista() {
    if (!usuario) return;
    setErro('');
    try {
      const qs = statusFiltro ? '?status=' + encodeURIComponent(statusFiltro) : '';
      setLista(await api<OSItem[]>('/os/os_listar.php' + qs));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, statusFiltro]);

  const agenda = useMemo(() => (
    lista
      .filter((os) => os.data_agendada && !['concluido', 'cancelado'].includes(os.status))
      .sort((a, b) => String(a.data_agendada).localeCompare(String(b.data_agendada)) || String(a.hora_agendada || '').localeCompare(String(b.hora_agendada || '')))
  ), [lista]);

  if (iniciando) {
    return <CenterLoading />;
  }

  if (!usuario) {
    return (
      <SafeAreaView style={styles.loginPage}>
        <StatusBar style="light" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginWrap}>
          <View style={styles.loginCard}>
            <Text style={styles.brand}>Lizzi Facilities</Text>
            <Text style={styles.loginTitle}>App de campo</Text>
            <Text style={styles.loginText}>Execute OS, checklist, agenda e assinaturas direto no celular.</Text>
            {!!erro && <Message type="erro" text={erro} />}
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
            <PrimaryButton label={carregando ? 'Entrando...' : 'Entrar'} onPress={login} disabled={carregando} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topBrand}>Lizzi Facilities</Text>
          <Text style={styles.topUser}>{usuario.nome}</Text>
        </View>
        <GhostButton label="Sair" onPress={sair} />
      </View>

      {!!erro && <Message type="erro" text={erro} />}
      {!!msg && <Message type="ok" text={msg} />}

      {detalheId ? (
        <OSDetalhe
          id={detalheId}
          premium={usuario.plano === 'premium'}
          voltar={() => { setDetalheId(null); carregarLista(); }}
          setErro={setErro}
          setMsg={setMsg}
        />
      ) : (
        <>
          {tab === 'os' && (
            <OSLista lista={lista} statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro} abrir={setDetalheId} atualizar={carregarLista} />
          )}
          {tab === 'agenda' && <Agenda lista={agenda} abrir={setDetalheId} atualizar={carregarLista} />}
          {tab === 'nova' && (
            <NovaOS
              premium={usuario.plano === 'premium'}
              abrir={(id) => { setDetalheId(id); carregarLista(); }}
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

function CenterLoading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1e66f5" />
      <Text style={styles.muted}>Carregando...</Text>
    </View>
  );
}

function Message({ type, text }: { type: 'erro' | 'ok'; text: string }) {
  return <Text style={[styles.message, type === 'erro' ? styles.messageErro : styles.messageOk]}>{text}</Text>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={styles.input} {...props} />
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.primaryBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.ghostBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress, disabled = false, danger = false }: { label: string; active?: boolean; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive, danger && !active && styles.chipDanger, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.chipText, active && styles.chipTextActive, danger && !active && styles.chipDangerText]}>{label}</Text>
    </Pressable>
  );
}

function OptionList<T extends { id: number; nome: string }>({ label, items, value, onChange, empty = 'Nenhuma opção' }: {
  label: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
  empty?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        <Chip label="Nenhum" active={!value} onPress={() => onChange('')} />
        {items.map((item) => <Chip key={item.id} label={item.nome} active={value === String(item.id)} onPress={() => onChange(String(item.id))} />)}
        {!items.length && <Text style={styles.emptyInline}>{empty}</Text>}
      </ScrollView>
    </View>
  );
}

function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <View style={styles.bottomTabs}>
      <Pressable style={[styles.bottomTab, tab === 'os' && styles.bottomTabOn]} onPress={() => setTab('os')}><Text style={[styles.bottomText, tab === 'os' && styles.bottomTextOn]}>OS</Text></Pressable>
      <Pressable style={[styles.bottomTab, tab === 'agenda' && styles.bottomTabOn]} onPress={() => setTab('agenda')}><Text style={[styles.bottomText, tab === 'agenda' && styles.bottomTextOn]}>Agenda</Text></Pressable>
      <Pressable style={[styles.bottomTab, tab === 'nova' && styles.bottomTabOn]} onPress={() => setTab('nova')}><Text style={[styles.bottomText, tab === 'nova' && styles.bottomTextOn]}>Nova OS</Text></Pressable>
    </View>
  );
}

function OSLista({ lista, statusFiltro, setStatusFiltro, abrir, atualizar }: {
  lista: OSItem[];
  statusFiltro: string;
  setStatusFiltro: (s: string) => void;
  abrir: (id: number) => void;
  atualizar: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <View style={styles.screenHead}>
        <Text style={styles.title}>Ordens de serviço</Text>
        <GhostButton label="Atualizar" onPress={atualizar} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
        <Chip label="Todas" active={!statusFiltro} onPress={() => setStatusFiltro('')} />
        {STATUS.map((s) => <Chip key={s} label={rotuloStatus(s)} active={statusFiltro === s} onPress={() => setStatusFiltro(s)} />)}
      </ScrollView>
      {lista.map((os) => <OSCard key={os.id} os={os} onPress={() => abrir(os.id)} />)}
      {!lista.length && <Text style={styles.empty}>Nenhuma OS encontrada.</Text>}
    </ScrollView>
  );
}

function Agenda({ lista, abrir, atualizar }: { lista: OSItem[]; abrir: (id: number) => void; atualizar: () => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <View style={styles.screenHead}>
        <Text style={styles.title}>Agenda do técnico</Text>
        <GhostButton label="Atualizar" onPress={atualizar} />
      </View>
      {lista.map((os) => <OSCard key={os.id} os={os} onPress={() => abrir(os.id)} agenda />)}
      {!lista.length && <Text style={styles.empty}>Nenhuma OS agendada em aberto.</Text>}
    </ScrollView>
  );
}

function OSCard({ os, onPress, agenda = false }: { os: OSItem; onPress: () => void; agenda?: boolean }) {
  const cor = STATUS_COLOR[os.status] || '#64748b';
  return (
    <Pressable style={styles.osCard} onPress={onPress}>
      <View style={styles.osCardTop}>
        <Text style={styles.osCodigo}>{os.codigo}</Text>
        <Text style={[styles.statusBadge, { color: cor, borderColor: cor }]}>{rotuloStatus(os.status)}</Text>
      </View>
      <Text style={styles.osTipo}>{os.tipo_os} - {rotuloPrioridade(os.prioridade)}</Text>
      <Text style={styles.osLocal}>{localOs(os)}</Text>
      <Text style={styles.osMeta}>{agenda ? dataHora(os.data_agendada, os.hora_agendada) : (os.tecnico_nome || 'Sem técnico')}</Text>
    </Pressable>
  );
}

function NovaOS({ premium, abrir, setErro, setMsg }: {
  premium: boolean;
  abrir: (id: number) => void;
  setErro: (s: string) => void;
  setMsg: (s: string) => void;
}) {
  const [unidades, setUnidades] = useState<Opcao[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tipos, setTipos] = useState<Categoria[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    unidade_id: '', piso_id: '', local_id: '', ativo_id: '', tecnico_id: '',
    tipo_os: '', prioridade: 'media', avaria: '', descricao: '', data_agendada: '', hora_agendada: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      api<Opcao[]>('/cadastros/unidades.php'),
      api<Tecnico[]>('/cadastros/tecnicos.php'),
      api<Categoria[]>('/cadastros/categorias.php'),
    ]).then(([u, t, c]) => {
      setUnidades(u);
      setTecnicos(t);
      setTipos(c);
      setForm((f) => ({ ...f, tipo_os: f.tipo_os || c[0]?.nome || 'Corretiva' }));
    }).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [setErro]);

  useEffect(() => {
    if (premium) api<Ativo[]>('/ativos/ativos.php').then(setAtivos).catch(() => {});
  }, [premium]);

  useEffect(() => {
    setPisos([]);
    setLocais([]);
    setForm((f) => ({ ...f, piso_id: '', local_id: '' }));
    if (form.unidade_id) api<Piso[]>('/cadastros/pisos.php?unidade_id=' + form.unidade_id).then(setPisos).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unidade_id]);

  useEffect(() => {
    setLocais([]);
    setForm((f) => ({ ...f, local_id: '' }));
    if (form.piso_id) api<Local[]>('/cadastros/locais.php?piso_id=' + form.piso_id).then(setLocais).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.piso_id]);

  const tecnicosDaUnidade = tecnicos.filter((t) => !form.unidade_id || !t.unidades?.length || t.unidades.includes(Number(form.unidade_id)));
  const ativosDoLocal = ativos.filter((a) => !form.local_id || a.local_id === Number(form.local_id));

  async function salvar() {
    setErro('');
    setMsg('');
    setSalvando(true);
    try {
      const criado = await api<{ id: number }>('/os/os_criar.php', {
        method: 'POST',
        body: {
          ...(form.unidade_id ? { unidade_id: Number(form.unidade_id) } : {}),
          ...(form.piso_id ? { piso_id: Number(form.piso_id) } : {}),
          ...(form.local_id ? { local_id: Number(form.local_id) } : {}),
          ...(form.ativo_id ? { ativo_id: Number(form.ativo_id) } : {}),
          ...(form.tecnico_id ? { tecnico_id: Number(form.tecnico_id) } : {}),
          tipo_os: form.tipo_os,
          prioridade: form.prioridade,
          avaria: form.avaria || null,
          descricao: form.descricao || null,
          data_agendada: form.data_agendada || null,
          hora_agendada: form.hora_agendada || null,
        },
      });
      setMsg('OS criada.');
      abrir(criado.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Text style={styles.title}>Nova OS</Text>
      <Text style={styles.label}>Tipo de chamado</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        {tipos.map((t) => <Chip key={t.id} label={t.nome} active={form.tipo_os === t.nome} onPress={() => set('tipo_os', t.nome)} />)}
        {!tipos.length && <Chip label="Corretiva" active onPress={() => set('tipo_os', 'Corretiva')} />}
      </ScrollView>

      <Text style={styles.label}>Prioridade</Text>
      <View style={styles.optionWrap}>
        {PRIORIDADES.map(([v, l]) => <Chip key={v} label={l} active={form.prioridade === v} onPress={() => set('prioridade', v)} />)}
      </View>

      <OptionList label="Unidade" items={unidades} value={form.unidade_id} onChange={(v) => set('unidade_id', v)} />
      <OptionList label="Piso" items={pisos} value={form.piso_id} onChange={(v) => set('piso_id', v)} empty="Escolha a unidade primeiro" />
      <OptionList label="Local" items={locais} value={form.local_id} onChange={(v) => set('local_id', v)} empty="Escolha o piso primeiro" />
      {premium && <OptionList label="Equipamento" items={ativosDoLocal} value={form.ativo_id} onChange={(v) => set('ativo_id', v)} />}
      <OptionList label="Atribuir técnico" items={tecnicosDaUnidade} value={form.tecnico_id} onChange={(v) => set('tecnico_id', v)} />

      <Field label="Data agendada (AAAA-MM-DD)" value={form.data_agendada} onChangeText={(v) => set('data_agendada', v)} placeholder="2026-06-30" />
      <Field label="Hora agendada (HH:MM)" value={form.hora_agendada} onChangeText={(v) => set('hora_agendada', v)} placeholder="14:30" />
      <Field label="Avaria" value={form.avaria} onChangeText={(v) => set('avaria', v)} placeholder="Resumo curto" />
      <View style={styles.field}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput style={[styles.input, styles.textarea]} multiline value={form.descricao} onChangeText={(v) => set('descricao', v)} placeholder="Detalhes do chamado" placeholderTextColor="#94a3b8" />
      </View>
      <PrimaryButton label={salvando ? 'Criando...' : 'Criar OS'} onPress={salvar} disabled={salvando || !form.tipo_os} />
    </ScrollView>
  );
}

function OSDetalhe({ id, premium, voltar, setErro, setMsg }: {
  id: number;
  premium: boolean;
  voltar: () => void;
  setErro: (s: string) => void;
  setMsg: (s: string) => void;
}) {
  const [os, setOs] = useState<OSDetalheData | null>(null);
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [respostas, setRespostas] = useState<Record<number, { marcado: boolean; observacao: string; imagem_url: string }>>({});
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);

  async function carregar() {
    const data = await api<OSDetalheData>('/os/os_detalhe.php?id=' + id);
    setOs(data);
    const mapa: Record<number, { marcado: boolean; observacao: string; imagem_url: string }> = {};
    (data.checklist || []).forEach((r) => {
      mapa[r.checklist_item_id] = { marcado: bool(r.marcado), observacao: r.observacao || '', imagem_url: r.imagem_url || '' };
    });
    setRespostas(mapa);
    if (premium && data.ativo_categoria_id) {
      setModelos(await api<ChecklistModelo[]>('/checklist/por_categoria.php?categoria_id=' + data.ativo_categoria_id));
    } else {
      setModelos([]);
    }
  }

  useEffect(() => {
    carregar().catch((e) => setErro(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setResposta(itemId: number, patch: Partial<{ marcado: boolean; observacao: string; imagem_url: string }>) {
    setRespostas((atuais) => ({
      ...atuais,
      [itemId]: { ...(atuais[itemId] || { marcado: false, observacao: '', imagem_url: '' }), ...patch },
    }));
  }

  async function mudarStatus(status: string) {
    if (!os) return;
    if (status === 'concluido') {
      const ok = await confirmar('Concluir OS', 'Confirma a conclusão desta OS? Depois ela fica travada para edição.');
      if (!ok) return;
    }
    if (status === 'cancelado') {
      const ok = await confirmar('Cancelar OS', 'Confirma o cancelamento desta OS?');
      if (!ok) return;
    }
    setErro('');
    setMsg('');
    try {
      await api('/os/os_atualizar_status.php', { method: 'POST', body: { id: os.id, status } });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function salvarChecklist() {
    if (!os) return;
    const itens = modelos.flatMap((m) => m.itens);
    setSalvandoChecklist(true);
    setErro('');
    try {
      for (const item of itens) {
        const resp = respostas[item.id];
        if (bool(item.obrigatorio) && !resp?.marcado) throw new Error('Marque o item obrigatório: ' + item.descricao);
        if (bool(item.exige_observacao) && !(resp?.observacao || '').trim()) throw new Error('Preencha a observação: ' + item.descricao);
      }
      await api('/checklist/respostas.php', {
        method: 'POST',
        body: {
          ordem_servico_id: os.id,
          respostas: itens.map((item) => ({
            checklist_item_id: item.id,
            marcado: Boolean(respostas[item.id]?.marcado),
            observacao: respostas[item.id]?.observacao || null,
            imagem_url: respostas[item.id]?.imagem_url || null,
          })),
        },
      });
      setMsg('Checklist salvo.');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvandoChecklist(false);
    }
  }

  async function salvarAssinatura(tipo: AssinaturaTipo, dataUrl: string) {
    if (!os) return;
    try {
      const uri = await salvarDataUrl(dataUrl, `assinatura_${tipo}_${os.id}.png`);
      const fd = new FormData();
      fd.append('ordem_servico_id', String(os.id));
      fd.append('tipo', tipo);
      fd.append('assinatura', { uri, name: `assinatura_${tipo}.png`, type: 'image/png' } as any);
      await api('/os/os_assinatura.php', { method: 'POST', body: fd, isForm: true });
      setMsg('Assinatura salva.');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  if (!os) return <CenterLoading />;
  const encerrada = ['concluido', 'cancelado'].includes(os.status);
  const tempoExec = minutosHHMM(minutosExecucao(os));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <GhostButton label="Voltar" onPress={voltar} />
      <View style={styles.detailCard}>
        <Text style={[styles.statusBadge, { color: STATUS_COLOR[os.status], borderColor: STATUS_COLOR[os.status] }]}>{rotuloStatus(os.status)}</Text>
        <Text style={styles.detailTitle}>{os.codigo}</Text>
        <Text style={styles.osTipo}>{os.tipo_os} - {rotuloPrioridade(os.prioridade)}</Text>
        <Text style={styles.osLocal}>{localOs(os)}</Text>
        <Text style={styles.osMeta}>Técnico: {os.tecnico_nome || '-'}</Text>
        <Text style={styles.osMeta}>Solicitante: {os.solicitante_nome || '-'}</Text>
        <Text style={styles.osMeta}>Atribuído: {dataHoraCompleta(os.created_at)}</Text>
        <Text style={styles.osMeta}>Início: {dataHoraCompleta(os.inicio_atendimento)}</Text>
        <Text style={styles.osMeta}>Fim: {dataHoraCompleta(os.fim_atendimento)}</Text>
        <Text style={styles.osMeta}>Tempo de execução: {tempoExec}</Text>
        {!!os.avaria && <Text style={styles.osMeta}>Avaria: {os.avaria}</Text>}
        {!!os.descricao && <Text style={styles.osMeta}>Descrição: {os.descricao}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Estado da OS</Text>
      <View style={styles.stateGrid}>
        {STATUS.map((estado) => {
          const atual = os.status === estado;
          const habilitado = podeMudarEstado(os.status, estado);
          return (
            <Pressable key={estado} style={[styles.stateBtn, atual && styles.stateBtnOn, !habilitado && !atual && styles.stateBtnDisabled]} onPress={() => mudarStatus(estado)} disabled={!habilitado}>
              <Text style={[styles.stateText, atual && styles.stateTextOn]}>{rotuloBotaoEstado(os.status, estado)}</Text>
            </Pressable>
          );
        })}
      </View>

      {premium && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {!os.ativo_categoria_id && <Text style={styles.empty}>OS sem equipamento/tipo de chamado vinculado para checklist.</Text>}
          {!!os.ativo_categoria_id && !modelos.length && <Text style={styles.empty}>Nenhum checklist cadastrado para este tipo de chamado.</Text>}
          {modelos.map((modelo) => (
            <View key={modelo.id} style={styles.checkModel}>
              <Text style={styles.checkModelTitle}>{modelo.nome}</Text>
              {modelo.itens.map((item) => (
                <View key={item.id} style={styles.checkItem}>
                  <Pressable style={styles.checkLine} onPress={() => !encerrada && setResposta(item.id, { marcado: !respostas[item.id]?.marcado })}>
                    <Text style={[styles.checkBox, respostas[item.id]?.marcado && styles.checkBoxOn]}>{respostas[item.id]?.marcado ? '✓' : ''}</Text>
                    <Text style={styles.checkText}>{item.descricao}{bool(item.obrigatorio) ? ' *' : ''}</Text>
                  </Pressable>
                  <TextInput
                    style={[styles.input, styles.textareaSmall]}
                    multiline
                    editable={!encerrada}
                    value={respostas[item.id]?.observacao || ''}
                    onChangeText={(v) => setResposta(item.id, { observacao: v })}
                    placeholder="Observação"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              ))}
            </View>
          ))}
          {!!modelos.length && !encerrada && <PrimaryButton label={salvandoChecklist ? 'Salvando...' : 'Salvar checklist'} onPress={salvarChecklist} disabled={salvandoChecklist} />}
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Assinaturas</Text>
        <SignatureBox title="Assinatura do técnico" locked={encerrada} onSave={(data) => salvarAssinatura('tecnico', data)} />
        <SignatureBox title="Assinatura do cliente" locked={encerrada} onSave={(data) => salvarAssinatura('cliente', data)} />
      </View>
    </ScrollView>
  );
}

function confirmar(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Sim', onPress: () => resolve(true) },
    ]);
  });
}

async function salvarDataUrl(dataUrl: string, filename: string): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const uri = `${FileSystem.cacheDirectory || ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

function SignatureBox({ title, locked, onSave }: { title: string; locked: boolean; onSave: (dataUrl: string) => void }) {
  const ref = useRef<any>(null);
  const [open, setOpen] = useState(false);

  if (locked) {
    return (
      <View style={styles.signatureCard}>
        <Text style={styles.checkModelTitle}>{title}</Text>
        <Text style={styles.emptyInline}>OS encerrada. Assinatura bloqueada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.signatureCard}>
      <Text style={styles.checkModelTitle}>{title}</Text>
      {!open ? (
        <GhostButton label="Coletar assinatura" onPress={() => setOpen(true)} />
      ) : (
        <>
          <View style={styles.signatureCanvas}>
            <SignatureScreen
              ref={ref}
              onOK={(data) => { setOpen(false); onSave(data); }}
              onEmpty={() => Alert.alert('Assinatura vazia', 'Assine antes de salvar.')}
              descriptionText="Assine no campo abaixo"
              clearText="Limpar"
              confirmText="Salvar"
              webStyle={signatureWebStyle}
            />
          </View>
          <View style={styles.signatureActions}>
            <GhostButton label="Cancelar" onPress={() => setOpen(false)} />
            <PrimaryButton label="Salvar assinatura" onPress={() => ref.current?.readSignature()} />
          </View>
        </>
      )}
    </View>
  );
}

const signatureWebStyle = `
  .m-signature-pad { box-shadow: none; border: 0; }
  .m-signature-pad--body { border: 1px solid #cbd5e1; border-radius: 12px; }
  .m-signature-pad--footer { display: none; }
  body, html { background: #fff; }
`;

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#eef4ff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef4ff', gap: 10 },
  muted: { color: '#64748b' },
  loginPage: { flex: 1, backgroundColor: '#0a49c2' },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 18 },
  loginCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, shadowColor: '#0f172a', shadowOpacity: .22, shadowRadius: 24, elevation: 8 },
  brand: { color: '#1e66f5', fontWeight: '900', fontSize: 18, marginBottom: 12 },
  loginTitle: { color: '#0f172a', fontSize: 28, fontWeight: '900' },
  loginText: { color: '#64748b', marginTop: 4, marginBottom: 18, lineHeight: 20 },
  topbar: { height: 64, paddingHorizontal: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dbe6f7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBrand: { color: '#1e66f5', fontWeight: '900', fontSize: 16 },
  topUser: { color: '#64748b', fontSize: 12 },
  screen: { flex: 1 },
  screenContent: { padding: 14, paddingBottom: 98 },
  screenHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 23, color: '#0f172a', fontWeight: '900' },
  sectionTitle: { fontSize: 16, color: '#0f172a', fontWeight: '900', marginTop: 16, marginBottom: 8 },
  field: { marginBottom: 10 },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', fontSize: 15 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  textareaSmall: { minHeight: 72, textAlignVertical: 'top', marginTop: 8 },
  primaryBtn: { backgroundColor: '#1e66f5', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  ghostBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  ghostText: { color: '#1e66f5', fontWeight: '900' },
  disabled: { opacity: .45 },
  message: { marginHorizontal: 14, marginTop: 10, padding: 11, borderRadius: 12, fontWeight: '700' },
  messageErro: { color: '#b91c1c', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  messageOk: { color: '#15803d', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  statusTabs: { gap: 8, paddingBottom: 12 },
  optionRow: { gap: 8, paddingBottom: 4 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: '#d6e2f5', backgroundColor: '#fff', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#1e66f5', borderColor: '#1e66f5' },
  chipDanger: { borderColor: '#fecaca' },
  chipText: { color: '#475569', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  chipDangerText: { color: '#dc2626' },
  osCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe6f7', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#0f172a', shadowOpacity: .08, shadowRadius: 12, elevation: 3 },
  osCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  osCodigo: { color: '#0f172a', fontWeight: '900', fontSize: 17 },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, fontWeight: '900', fontSize: 11, alignSelf: 'flex-start' },
  osTipo: { color: '#475569', marginTop: 6, fontWeight: '700' },
  osLocal: { color: '#0f172a', marginTop: 6 },
  osMeta: { color: '#64748b', marginTop: 4, fontSize: 12 },
  empty: { color: '#64748b', textAlign: 'center', padding: 22 },
  emptyInline: { color: '#64748b', paddingVertical: 8 },
  bottomTabs: { position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: '#fff', borderRadius: 18, padding: 6, borderWidth: 1, borderColor: '#dbe6f7', flexDirection: 'row', shadowColor: '#0f172a', shadowOpacity: .18, shadowRadius: 18, elevation: 9 },
  bottomTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 13 },
  bottomTabOn: { backgroundColor: '#1e66f5' },
  bottomText: { color: '#64748b', fontWeight: '900' },
  bottomTextOn: { color: '#fff' },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dbe6f7', marginTop: 10 },
  detailTitle: { fontSize: 25, color: '#0f172a', fontWeight: '900', marginTop: 8 },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stateBtn: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d6e2f5', borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  stateBtnOn: { backgroundColor: '#1e66f5', borderColor: '#1e66f5' },
  stateBtnDisabled: { backgroundColor: '#f8fafc', opacity: .55 },
  stateText: { color: '#475569', fontWeight: '900', textAlign: 'center' },
  stateTextOn: { color: '#fff' },
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dbe6f7', marginTop: 14 },
  checkModel: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 10 },
  checkModelTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15, marginBottom: 6 },
  checkItem: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 13, padding: 10, marginTop: 8 },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: '#94a3b8', textAlign: 'center', lineHeight: 22, color: '#fff', fontWeight: '900' },
  checkBoxOn: { backgroundColor: '#1e66f5', borderColor: '#1e66f5' },
  checkText: { flex: 1, color: '#0f172a', fontWeight: '700' },
  signatureCard: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 10 },
  signatureCanvas: { height: 250, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1' },
  signatureActions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
});
