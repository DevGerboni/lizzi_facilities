import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

import { Chip, EmptyState, Field, GhostButton, OptionList, PrimaryButton, ScreenIntro, SectionCard } from '../../components/ui';
import { RecursoPremiumError, resolverUrlArquivo } from '../../lib/api';
import { escolherImagens } from '../../lib/media';
import { PRIORIDADES } from '../../lib/os-rules';
import { styles } from '../../theme/styles';
import type { Ativo, Categoria, Local, NovoOSForm, Opcao, Piso, Tecnico } from '../../types/mobile';
import {
  criarOS,
  listarAtivos,
  listarCategorias,
  listarLocais,
  listarPisos,
  listarTecnicos,
  listarUnidades,
  uploadImagemOS,
} from './api';

const FORM_INICIAL: NovoOSForm = {
  unidade_id: '',
  piso_id: '',
  local_id: '',
  ativo_id: '',
  tecnico_id: '',
  tipo_os: '',
  prioridade: 'media',
  avaria: '',
  descricao: '',
  observacao: '',
  data_agendada: '',
  hora_agendada: '',
};

export function NewOSScreen({
  premium,
  abrir,
  setErro,
  setMsg,
}: {
  premium: boolean;
  abrir: (id: number) => void;
  setErro: (value: string) => void;
  setMsg: (value: string) => void;
}) {
  const [unidades, setUnidades] = useState<Opcao[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tipos, setTipos] = useState<Categoria[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [imagens, setImagens] = useState<ImagePickerAsset[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<NovoOSForm>(FORM_INICIAL);

  const set = (key: keyof NovoOSForm, value: string) => setForm((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    Promise.all([listarUnidades(), listarTecnicos(), listarCategorias()])
      .then(([u, t, c]) => {
        setUnidades(u);
        setTecnicos(t);
        setTipos(c);
        setForm((old) => ({ ...old, tipo_os: old.tipo_os || c[0]?.nome || 'Corretiva' }));
      })
      .catch((error: unknown) => setErro(error instanceof Error ? error.message : String(error)));
  }, [setErro]);

  useEffect(() => {
    if (!premium) return;
    listarAtivos()
      .then(setAtivos)
      .catch((error: unknown) => {
        if (!(error instanceof RecursoPremiumError)) {
          setErro(error instanceof Error ? error.message : String(error));
        }
      });
  }, [premium, setErro]);

  useEffect(() => {
    setPisos([]);
    setLocais([]);
    set('piso_id', '');
    set('local_id', '');
    if (!form.unidade_id) return;

    listarPisos(form.unidade_id).then(setPisos).catch(() => undefined);
  }, [form.unidade_id]);

  useEffect(() => {
    setLocais([]);
    set('local_id', '');
    if (!form.piso_id) return;

    listarLocais(form.piso_id).then(setLocais).catch(() => undefined);
  }, [form.piso_id]);

  const ativosDoLocal = useMemo(
    () => ativos.filter((item) => !form.local_id || item.local_id === Number(form.local_id)),
    [ativos, form.local_id],
  );

  const tecnicosDaUnidade = useMemo(
    () => tecnicos.filter((item) => !form.unidade_id || !item.unidades?.length || item.unidades.includes(Number(form.unidade_id))),
    [tecnicos, form.unidade_id],
  );

  async function selecionarImagens() {
    try {
      const assets = await escolherImagens(true);
      if (assets.length) {
        setImagens((atual) => [...atual, ...assets]);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  async function salvar() {
    if (!form.tipo_os) {
      setErro('Selecione o tipo de chamado.');
      return;
    }

    setErro('');
    setMsg('');
    setSalvando(true);

    try {
      const body = {
        ...(form.unidade_id ? { unidade_id: Number(form.unidade_id) } : {}),
        ...(form.piso_id ? { piso_id: Number(form.piso_id) } : {}),
        ...(form.local_id ? { local_id: Number(form.local_id) } : {}),
        ...(form.ativo_id ? { ativo_id: Number(form.ativo_id) } : {}),
        ...(form.tecnico_id ? { tecnico_id: Number(form.tecnico_id) } : {}),
        tipo_os: form.tipo_os,
        prioridade: form.prioridade,
        avaria: form.avaria || null,
        descricao: form.descricao || null,
        observacao: form.observacao || null,
        data_agendada: form.data_agendada || null,
        hora_agendada: form.hora_agendada || null,
      };

      const criado = await criarOS(body);
      for (const imagem of imagens) {
        await uploadImagemOS(criado.id, 'abertura', imagem);
      }

      setMsg('OS criada com sucesso.');
      setImagens([]);
      setForm(FORM_INICIAL);
      abrir(criado.id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <ScreenIntro
        eyebrow="Cadastro"
        title="Abra uma nova OS com mais contexto"
        text="Preencha localização, prioridade, técnico e evidências iniciais para a equipe começar o atendimento com clareza."
        metrics={[
          { label: 'Tipos disponíveis', value: tipos.length || 0, tone: 'accent' },
          { label: 'Técnicos visíveis', value: tecnicosDaUnidade.length || tecnicos.length || 0 },
          { label: premium ? 'Modo premium' : 'Plano atual', value: premium ? 'Ativo' : 'Essencial', tone: 'warning' },
        ]}
      />

      <SectionCard title="Classificação do chamado" text="Defina o tipo de atendimento e o nível de prioridade antes de seguir.">
        <View style={styles.field}>
          <Text style={styles.label}>Tipo de chamado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
            {tipos.map((item) => (
              <Chip
                key={item.id}
                label={item.nome}
                active={form.tipo_os === item.nome}
                onPress={() => set('tipo_os', item.nome)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Prioridade</Text>
          <View style={styles.optionWrap}>
            {PRIORIDADES.map(([valor, label]) => (
              <Chip key={valor} label={label} active={form.prioridade === valor} onPress={() => set('prioridade', valor)} />
            ))}
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Local e responsável" text="Vincule a OS ao espaço correto e, quando necessário, já atribua o técnico responsável.">
        <OptionList label="Unidade" items={unidades} value={form.unidade_id} onChange={(value) => set('unidade_id', value)} />
        <OptionList label="Piso" items={pisos} value={form.piso_id} onChange={(value) => set('piso_id', value)} empty="Escolha a unidade primeiro." />
        <OptionList label="Local" items={locais} value={form.local_id} onChange={(value) => set('local_id', value)} empty="Escolha o piso primeiro." />
        {premium && (
          <OptionList
            label="Equipamento"
            items={ativosDoLocal}
            value={form.ativo_id}
            onChange={(value) => set('ativo_id', value)}
            empty="Nenhum equipamento disponível para este local."
            noneLabel="Sem equipamento"
          />
        )}
        <OptionList
          label="Atribuir técnico"
          items={tecnicosDaUnidade}
          value={form.tecnico_id}
          onChange={(value) => set('tecnico_id', value)}
          empty="Nenhum técnico disponível."
        />
      </SectionCard>

      <SectionCard title="Contexto operacional" text="Inclua agenda, resumo da falha e informações de apoio para acelerar o atendimento.">
        <Field label="Data agendada (AAAA-MM-DD)" value={form.data_agendada} onChangeText={(value) => set('data_agendada', value)} placeholder="2026-06-30" />
        <Field label="Hora agendada (HH:MM)" value={form.hora_agendada} onChangeText={(value) => set('hora_agendada', value)} placeholder="14:30" />
        <Field label="Avaria" value={form.avaria} onChangeText={(value) => set('avaria', value)} placeholder="Resumo curto do problema" />

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            value={form.descricao}
            onChangeText={(value) => set('descricao', value)}
            placeholder="Detalhes completos do chamado"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Observação interna</Text>
          <TextInput
            style={[styles.input, styles.textareaSmall]}
            multiline
            value={form.observacao}
            onChangeText={(value) => set('observacao', value)}
            placeholder="Informações adicionais para a equipe"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </SectionCard>

      <SectionCard title="Imagens de abertura" text="Anexe evidências iniciais ainda na criação para registrar a condição do local ou equipamento.">
        <View style={styles.inlineActions}>
          <GhostButton label="Selecionar imagens" onPress={selecionarImagens} />
          {!!imagens.length && <GhostButton label="Limpar seleção" onPress={() => setImagens([])} danger />}
        </View>

        {!!imagens.length && (
          <View style={styles.imageRow}>
            {imagens.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.imageTile}>
                <Image source={{ uri: resolverUrlArquivo(item.uri) }} style={styles.imageThumb} />
                <View style={styles.imageInfo}>
                  <Text style={styles.osMeta}>{item.fileName || `imagem-${index + 1}.jpg`}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!imagens.length && (
          <EmptyState
            title="Nenhuma evidência selecionada"
            text="Você pode criar a OS sem imagens, mas registrar a abertura ajuda na rastreabilidade do atendimento."
          />
        )}
      </SectionCard>

      <PrimaryButton label={salvando ? 'Criando...' : 'Criar OS'} onPress={salvar} disabled={salvando || !form.tipo_os} />
    </ScrollView>
  );
}
