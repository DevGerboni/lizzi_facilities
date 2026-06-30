import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';

import { Chip, EmptyState, GhostButton, ScreenIntro, SectionCard } from '../../components/ui';
import { rotuloStatus } from '../../lib/formatters';
import { STATUS } from '../../lib/os-rules';
import { styles } from '../../theme/styles';
import type { OSItem } from '../../types/mobile';
import { OSCard } from './OSCard';

export function OSListScreen({
  lista,
  statusFiltro,
  setStatusFiltro,
  abrir,
  atualizar,
}: {
  lista: OSItem[];
  statusFiltro: string;
  setStatusFiltro: (status: string) => void;
  abrir: (id: number) => void;
  atualizar: () => void;
}) {
  const metricas = useMemo(() => {
    const abertas = lista.filter((os) => ['aberto', 'em_andamento', 'aguardando_aprovacao'].includes(os.status)).length;
    const concluidas = lista.filter((os) => os.status === 'concluido').length;

    return [
      { label: 'Total no app', value: lista.length, tone: 'accent' as const },
      { label: 'Em fluxo', value: abertas },
      { label: 'Concluídas', value: concluidas, tone: 'warning' as const },
    ];
  }, [lista]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <ScreenIntro
        eyebrow="Operação"
        title="Ordens de serviço com visão rápida"
        text="Acompanhe prioridades, filtre por estado e entre direto no atendimento sem perder contexto."
        metrics={metricas}
      />

      <SectionCard title="Filtros de status" text="Refine a listagem para focar no que realmente precisa de ação agora.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
          <Chip label="Todas" active={!statusFiltro} onPress={() => setStatusFiltro('')} />
          {STATUS.map((status) => (
            <Chip
              key={status}
              label={rotuloStatus(status)}
              active={statusFiltro === status}
              onPress={() => setStatusFiltro(status)}
            />
          ))}
        </ScrollView>
        <GhostButton label="Atualizar lista" onPress={atualizar} />
      </SectionCard>

      <SectionCard
        title="Fila de atendimento"
        text={statusFiltro ? `Exibindo OS com status ${rotuloStatus(statusFiltro)}.` : 'Exibindo todas as ordens disponíveis para o usuário logado.'}
      >
        {lista.map((os) => (
          <OSCard key={os.id} os={os} onPress={() => abrir(os.id)} />
        ))}
        {!lista.length && (
          <EmptyState
            title="Nenhuma OS encontrada"
            text="Quando novas ordens estiverem disponíveis, elas aparecerão aqui com prioridade, local e responsável."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}
