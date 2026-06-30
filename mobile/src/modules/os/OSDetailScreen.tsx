import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';

import { CenterLoading, EmptyState, Field, GhostButton, Message, OptionList, PrimaryButton, SectionCard } from '../../components/ui';
import { RecursoPremiumError, resolverUrlArquivo } from '../../lib/api';
import { salvarDataUrl } from '../../lib/files';
import { bool, dataHoraCompleta, localOs, minutosExecucao, minutosHHMM, rotuloPrioridade, rotuloStatus } from '../../lib/formatters';
import { escolherImagens } from '../../lib/media';
import { podeMudarEstado, podeReagendar, rotuloBotaoEstado, STATUS, STATUS_COLOR } from '../../lib/os-rules';
import { signatureWebStyle, styles } from '../../theme/styles';
import type {
  AssinaturaTipo,
  ChecklistModelo,
  ChecklistRespostaState,
  ImagemOS,
  OSDetalheData,
  Tecnico,
} from '../../types/mobile';
import {
  atualizarStatusOS,
  detalharOS,
  excluirImagemOS,
  listarChecklistPorOS,
  listarTecnicos,
  reagendarOS,
  salvarAssinatura,
  salvarChecklistRespostas,
  uploadImagemChecklist,
  uploadImagemOS,
} from './api';

type TipoImagemOS = 'abertura' | 'execucao' | 'conclusao';

interface ReagendarState {
  data_agendada: string;
  hora_agendada: string;
  tecnico_id: string;
}

const REAGENDAR_INICIAL: ReagendarState = {
  data_agendada: '',
  hora_agendada: '',
  tecnico_id: '',
};

export function OSDetailScreen({
  id,
  premium,
  perfil,
  voltar,
  setErro,
  setMsg,
}: {
  id: number;
  premium: boolean;
  perfil: string;
  voltar: () => void;
  setErro: (value: string) => void;
  setMsg: (value: string) => void;
}) {
  const [os, setOs] = useState<OSDetalheData | null>(null);
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [respostas, setRespostas] = useState<Record<number, ChecklistRespostaState>>({});
  const [checklistUploads, setChecklistUploads] = useState<Record<number, ImagePickerAsset | null>>({});
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);
  const [tipoImagem, setTipoImagem] = useState<TipoImagemOS>('execucao');
  const [selecionadasOS, setSelecionadasOS] = useState<ImagePickerAsset[]>([]);
  const [enviandoImagens, setEnviandoImagens] = useState(false);
  const [agendarAberto, setAgendarAberto] = useState(false);
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [reagendar, setReagendar] = useState<ReagendarState>(REAGENDAR_INICIAL);

  const podeAgendar = useMemo(() => podeReagendar(perfil), [perfil]);

  async function carregar() {
    const data = await detalharOS(id);
    setOs(data);

    const mapa: Record<number, ChecklistRespostaState> = {};
    (data.checklist || []).forEach((item) => {
      mapa[item.checklist_item_id] = {
        marcado: bool(item.marcado),
        observacao: item.observacao || '',
        imagem_url: item.imagem_url || '',
      };
    });
    setRespostas(mapa);
    setChecklistUploads({});
  }

  useEffect(() => {
    carregar().catch((error: unknown) => setErro(error instanceof Error ? error.message : String(error)));
  }, [id, setErro]);

  useEffect(() => {
    if (!premium || !os) {
      setModelos([]);
      return;
    }

    listarChecklistPorOS(os.id)
      .then(setModelos)
      .catch((error: unknown) => {
        if (error instanceof RecursoPremiumError) {
          setModelos([]);
          return;
        }
        setErro(error instanceof Error ? error.message : String(error));
      });
  }, [premium, os?.id, setErro]);

  useEffect(() => {
    if (!podeAgendar) return;
    listarTecnicos().then(setTecnicos).catch(() => undefined);
  }, [podeAgendar]);

  function setResposta(itemId: number, patch: Partial<ChecklistRespostaState>) {
    setRespostas((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || { marcado: false, observacao: '', imagem_url: '' }),
        ...patch,
      },
    }));
  }

  async function confirmarAcao(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Não', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sim', onPress: () => resolve(true) },
      ]);
    });
  }

  async function executarStatus(status: string) {
    if (!os) return;

    if (status === 'concluido') {
      const ok = await confirmarAcao(
        'Concluir ordem de serviço',
        'Ao concluir, a OS ficará travada para novas alterações. Deseja continuar?',
      );
      if (!ok) return;
    }

    if (status === 'cancelado') {
      const ok = await confirmarAcao('Cancelar ordem de serviço', 'Esta ação é definitiva. Deseja cancelar a OS?');
      if (!ok) return;
    }

    setErro('');
    setMsg('');
    try {
      await atualizarStatusOS(os.id, status);
      await carregar();
      setMsg('Status atualizado.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  function abrirReagendamento() {
    if (!os) return;

    setReagendar({
      data_agendada: os.data_agendada || '',
      hora_agendada: os.hora_agendada ? String(os.hora_agendada).slice(0, 5) : '',
      tecnico_id: os.tecnico_id ? String(os.tecnico_id) : '',
    });
    setAgendarAberto(true);
  }

  function acaoEstado(estado: string) {
    if (!os) return;
    if (os.status === 'aguardando_aprovacao' && estado === 'aberto') {
      if (!podeAgendar) {
        setErro('O reagendamento pelo mobile está disponível apenas para supervisor ou administrador.');
        return;
      }
      abrirReagendamento();
      return;
    }
    executarStatus(estado);
  }

  async function salvarReagendamento() {
    if (!os) return;
    setErro('');
    setMsg('');
    setSalvandoAgenda(true);
    try {
      await reagendarOS({
        ordem_servico_id: os.id,
        data_agendada: reagendar.data_agendada || null,
        hora_agendada: reagendar.hora_agendada || null,
        tecnico_id: reagendar.tecnico_id ? Number(reagendar.tecnico_id) : null,
      });
      setAgendarAberto(false);
      setMsg('Agendamento salvo.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setSalvandoAgenda(false);
    }
  }

  async function selecionarImagemChecklist(itemId: number) {
    try {
      const imagens = await escolherImagens(false);
      if (imagens[0]) {
        setChecklistUploads((current) => ({ ...current, [itemId]: imagens[0] }));
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  async function salvarChecklist() {
    if (!os) return;
    const itens = modelos.flatMap((modelo) => modelo.itens);

    setSalvandoChecklist(true);
    setErro('');
    setMsg('');

    try {
      const imagemUrls: Record<number, string> = {};

      for (const item of itens) {
        const resposta = respostas[item.id];
        const upload = checklistUploads[item.id];

        if (bool(item.obrigatorio) && !resposta?.marcado) {
          throw new Error('Marque o item obrigatório: ' + item.descricao);
        }
        if (bool(item.exige_observacao) && !(resposta?.observacao || '').trim()) {
          throw new Error('Preencha a observação: ' + item.descricao);
        }
        if (bool(item.exige_foto) && !upload && !(resposta?.imagem_url || '').trim()) {
          throw new Error('Anexe a foto obrigatória: ' + item.descricao);
        }

        if (upload) {
          const enviado = await uploadImagemChecklist(upload);
          imagemUrls[item.id] = enviado.imagem_url;
        }
      }

      await salvarChecklistRespostas({
        ordem_servico_id: os.id,
        respostas: itens.map((item) => ({
          checklist_item_id: item.id,
          marcado: Boolean(respostas[item.id]?.marcado),
          observacao: respostas[item.id]?.observacao || null,
          imagem_url: imagemUrls[item.id] || respostas[item.id]?.imagem_url || null,
        })),
      });

      setMsg('Checklist salvo.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setSalvandoChecklist(false);
    }
  }

  async function selecionarImagensOS() {
    try {
      const imagens = await escolherImagens(true);
      if (imagens.length) {
        setSelecionadasOS((current) => [...current, ...imagens]);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  async function enviarImagensOS() {
    if (!os || !selecionadasOS.length) return;
    setEnviandoImagens(true);
    setErro('');
    setMsg('');

    try {
      for (const imagem of selecionadasOS) {
        await uploadImagemOS(os.id, tipoImagem, imagem);
      }
      setSelecionadasOS([]);
      setMsg('Imagens enviadas.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setEnviandoImagens(false);
    }
  }

  async function removerImagem(imagem: ImagemOS) {
    const ok = await confirmarAcao('Excluir imagem', 'Deseja remover esta imagem da OS?');
    if (!ok) return;

    setErro('');
    setMsg('');
    try {
      await excluirImagemOS(imagem.id);
      setMsg('Imagem excluída.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  async function salvarAssinaturaLocal(tipo: AssinaturaTipo, dataUrl: string) {
    if (!os) return;

    try {
      const uri = await salvarDataUrl(dataUrl, `assinatura-${tipo}-${os.id}.png`);
      await salvarAssinatura(os.id, tipo, uri);
      setMsg('Assinatura salva.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    }
  }

  if (!os) return <CenterLoading />;

  const encerrada = ['concluido', 'cancelado'].includes(os.status);
  const tempoExecucao = minutosHHMM(minutosExecucao(os));
  const itensChecklist = modelos.flatMap((modelo) => modelo.itens);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <GhostButton label="Voltar para a lista" onPress={voltar} />

      <View style={styles.detailCard}>
        <Text style={[styles.statusBadge, { color: STATUS_COLOR[os.status], borderColor: STATUS_COLOR[os.status] }]}>
          {rotuloStatus(os.status)}
        </Text>
        <Text style={styles.detailTitle}>{os.codigo}</Text>
        <Text style={styles.osTipo}>
          {os.tipo_os} - {rotuloPrioridade(os.prioridade)}
        </Text>
        <Text style={[styles.osLocal, { color: '#fffdf8' }]}>{localOs(os)}</Text>
        <View style={styles.detailMetaGrid}>
          <MetaCard label="Técnico" value={os.tecnico_nome || '-'} />
          <MetaCard label="Solicitante" value={os.solicitante_nome || '-'} />
          <MetaCard label="Abertura" value={dataHoraCompleta(os.created_at)} />
          <MetaCard label="Execução" value={tempoExecucao} />
          <MetaCard label="Início" value={dataHoraCompleta(os.inicio_atendimento)} />
          <MetaCard label="Fim" value={dataHoraCompleta(os.fim_atendimento)} />
        </View>
      </View>

      <SectionCard title="Agendamento e contexto" text="Use este bloco para revisar a programação e o resumo operacional desta OS.">
        <Text style={styles.osMeta}>
          Programado para {os.data_agendada || '-'} {os.hora_agendada ? String(os.hora_agendada).slice(0, 5) : ''}
        </Text>
        <Text style={styles.osMeta}>Observação: {os.observacao || '-'}</Text>
        <Text style={styles.osMeta}>Avaria: {os.avaria || '-'}</Text>
        <Text style={styles.osMeta}>Descrição: {os.descricao || '-'}</Text>
      </SectionCard>

      {encerrada && <Message type="aviso" text="Esta OS está encerrada e permanece disponível apenas para consulta." />}

      <SectionCard title="Fluxo da OS" text="Avance o atendimento de acordo com as regras do processo e o perfil do usuário.">
        <View style={styles.stateGrid}>
          {STATUS.map((estado) => {
            const atual = os.status === estado;
            const bloqueadoPorPerfil = os.status === 'aguardando_aprovacao' && estado === 'aberto' && !podeAgendar;
            const habilitado = podeMudarEstado(os.status, estado) && !bloqueadoPorPerfil;

            return (
              <Pressable
                key={estado}
                style={[styles.stateBtn, atual && styles.stateBtnOn, !habilitado && !atual && styles.stateBtnDisabled]}
                onPress={() => acaoEstado(estado)}
                disabled={!habilitado}
              >
                <Text style={[styles.stateText, atual && styles.stateTextOn]}>
                  {atual ? rotuloStatus(estado) : rotuloBotaoEstado(os.status, estado)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      {agendarAberto && (
        <SectionCard title="Reagendar atendimento" text="Disponível para supervisor ou administrador quando a OS aguarda aprovação.">
          <Field
            label="Data agendada"
            value={reagendar.data_agendada}
            onChangeText={(value) => setReagendar((old) => ({ ...old, data_agendada: value }))}
            placeholder="2026-06-30"
          />
          <Field
            label="Hora agendada"
            value={reagendar.hora_agendada}
            onChangeText={(value) => setReagendar((old) => ({ ...old, hora_agendada: value }))}
            placeholder="14:30"
          />
          <OptionList
            label="Técnico"
            items={tecnicos}
            value={reagendar.tecnico_id}
            onChange={(value) => setReagendar((old) => ({ ...old, tecnico_id: value }))}
            empty="Nenhum técnico encontrado."
            noneLabel="Manter atual"
          />
          <View style={styles.inlineActions}>
            <GhostButton label="Cancelar" onPress={() => setAgendarAberto(false)} />
            <PrimaryButton label={salvandoAgenda ? 'Salvando...' : 'Salvar agendamento'} onPress={salvarReagendamento} disabled={salvandoAgenda} />
          </View>
        </SectionCard>
      )}

      <SectionCard title="Imagens da OS" text="Registre evidências de abertura, execução e conclusão diretamente no atendimento.">
        {!encerrada && (
          <>
            <Text style={styles.label}>Tipo da evidência</Text>
            <View style={styles.optionWrap}>
              <ChipLike label="Abertura" active={tipoImagem === 'abertura'} onPress={() => setTipoImagem('abertura')} />
              <ChipLike label="Execução" active={tipoImagem === 'execucao'} onPress={() => setTipoImagem('execucao')} />
              <ChipLike label="Conclusão" active={tipoImagem === 'conclusao'} onPress={() => setTipoImagem('conclusao')} />
            </View>
            <View style={styles.inlineActions}>
              <GhostButton label="Selecionar imagens" onPress={selecionarImagensOS} />
              {!!selecionadasOS.length && <GhostButton label="Limpar seleção" onPress={() => setSelecionadasOS([])} danger />}
            </View>
          </>
        )}

        {!!selecionadasOS.length && (
          <View style={styles.imageRow}>
            {selecionadasOS.map((imagem, index) => (
              <View key={`${imagem.uri}-${index}`} style={styles.imageTile}>
                <Image source={{ uri: imagem.uri }} style={styles.imageThumb} />
                <View style={styles.imageInfo}>
                  <Text style={styles.imageTag}>{tipoImagem}</Text>
                  <Text style={styles.osMeta}>{imagem.fileName || `imagem-${index + 1}.jpg`}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!!selecionadasOS.length && !encerrada && (
          <PrimaryButton label={enviandoImagens ? 'Enviando...' : 'Enviar imagens'} onPress={enviarImagensOS} disabled={enviandoImagens} />
        )}

        {!os.imagens.length && !selecionadasOS.length && (
          <EmptyState
            title="Sem imagens anexadas"
            text="As evidências visuais desta OS aparecerão aqui assim que forem registradas no atendimento."
          />
        )}

        {!!os.imagens.length && (
          <View style={styles.imageRow}>
            {os.imagens.map((imagem) => (
              <View key={imagem.id} style={styles.imageTile}>
                <Image source={{ uri: resolverUrlArquivo(imagem.imagem_url) }} style={styles.imageThumb} />
                <View style={styles.imageInfo}>
                  <View style={styles.imageTagRow}>
                    <Text style={styles.imageTag}>{imagem.tipo}</Text>
                    <Text style={styles.osMeta}>{dataHoraCompleta(imagem.created_at)}</Text>
                  </View>
                  {!encerrada && <GhostButton label="Excluir imagem" onPress={() => removerImagem(imagem)} danger />}
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {premium && (
        <SectionCard title="Checklist técnico" text="Valide os itens obrigatórios, registre observações e anexe imagens quando necessário.">
          {!modelos.length && <EmptyState title="Checklist indisponível" text="Nenhum modelo de checklist está vinculado a esta OS." />}
          {modelos.map((modelo) => (
            <View key={modelo.id} style={styles.checkModel}>
              <Text style={styles.checkModelTitle}>{modelo.nome}</Text>
              {modelo.itens.map((item) => {
                const resposta = respostas[item.id];
                const upload = checklistUploads[item.id];

                return (
                  <View key={item.id} style={styles.checkItem}>
                    <Pressable
                      style={styles.checkLine}
                      onPress={() => !encerrada && setResposta(item.id, { marcado: !resposta?.marcado })}
                    >
                      <Text style={[styles.checkBox, resposta?.marcado && styles.checkBoxOn]}>{resposta?.marcado ? 'OK' : ''}</Text>
                      <Text style={styles.checkText}>
                        {item.descricao}
                        {bool(item.obrigatorio) ? ' *' : ''}
                      </Text>
                    </Pressable>

                    <TextInput
                      style={[styles.input, styles.textareaSmall]}
                      multiline
                      editable={!encerrada}
                      value={resposta?.observacao || ''}
                      onChangeText={(value) => setResposta(item.id, { observacao: value })}
                      placeholder="Observação"
                      placeholderTextColor="#94a3b8"
                    />

                    {(bool(item.exige_foto) || resposta?.imagem_url || upload) && (
                      <View style={styles.inlineActions}>
                        {!encerrada && <GhostButton label="Selecionar foto" onPress={() => selecionarImagemChecklist(item.id)} />}
                        {!!resposta?.imagem_url && <Image source={{ uri: resolverUrlArquivo(resposta.imagem_url) }} style={styles.imageThumb} />}
                        {!!upload && <Image source={{ uri: upload.uri }} style={styles.imageThumb} />}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          {!!itensChecklist.length && !encerrada && (
            <PrimaryButton label={salvandoChecklist ? 'Salvando...' : 'Salvar checklist'} onPress={salvarChecklist} disabled={salvandoChecklist} />
          )}
        </SectionCard>
      )}

      <SectionCard title="Assinaturas" text="Colete a validação do técnico e do cliente diretamente pelo app.">
        <SignatureBox
          title="Assinatura do técnico"
          locked={encerrada}
          imageUrl={os.assinatura_tecnico_url}
          onSave={(data) => salvarAssinaturaLocal('tecnico', data)}
        />
        <SignatureBox
          title="Assinatura do cliente"
          locked={encerrada}
          imageUrl={os.assinatura_cliente_url}
          onSave={(data) => salvarAssinaturaLocal('cliente', data)}
        />
      </SectionCard>
    </ScrollView>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailMetaCard}>
      <Text style={styles.detailMetaLabel}>{label}</Text>
      <Text style={styles.detailMetaValue}>{value || '-'}</Text>
    </View>
  );
}

function ChipLike({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SignatureBox({
  title,
  locked,
  imageUrl,
  onSave,
}: {
  title: string;
  locked: boolean;
  imageUrl?: string | null;
  onSave: (dataUrl: string) => void;
}) {
  const ref = useRef<any>(null);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.signatureCard}>
      <Text style={styles.checkModelTitle}>{title}</Text>
      {!!imageUrl && <Image source={{ uri: resolverUrlArquivo(imageUrl) }} style={styles.imageThumb} />}
      {locked ? (
        <Text style={styles.emptyInline}>OS encerrada. Assinatura bloqueada.</Text>
      ) : !open ? (
        <GhostButton label={imageUrl ? 'Refazer assinatura' : 'Coletar assinatura'} onPress={() => setOpen(true)} />
      ) : (
        <>
          <View style={styles.signatureCanvas}>
            <SignatureScreen
              ref={ref}
              onOK={(data) => {
                setOpen(false);
                onSave(data);
              }}
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
