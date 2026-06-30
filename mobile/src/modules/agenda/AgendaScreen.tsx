import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';

import { EmptyState, GhostButton, ScreenIntro, SectionCard } from '../../components/ui';
import { styles } from '../../theme/styles';
import type { OSItem } from '../../types/mobile';
import { OSCard } from '../os/OSCard';

export function AgendaScreen({
  lista,
  abrir,
  atualizar,
}: {
  lista: OSItem[];
  abrir: (id: number) => void;
  atualizar: () => void;
}) {
  const metricas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const hojeCount = lista.filter((os) => os.data_agendada === hoje).length;

    return [
      { label: 'Agendadas', value: lista.length, tone: 'accent' as const },
      { label: 'Para hoje', value: hojeCount },
      { label: 'Próximas', value: Math.max(lista.length - hojeCount, 0), tone: 'warning' as const },
    ];
  }, [lista]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <ScreenIntro
        eyebrow="Agenda"
        title="Roteiro técnico organizado"
        text="Veja os atendimentos programados, priorize deslocamentos e abra a OS certa com poucos toques."
        metrics={metricas}
      />

      <SectionCard title="Atendimentos programados" text="A agenda mostra apenas ordens ainda abertas e com data agendada.">
        <GhostButton label="Atualizar agenda" onPress={atualizar} />
        {lista.map((os) => (
          <OSCard key={os.id} os={os} onPress={() => abrir(os.id)} agenda />
        ))}
        {!lista.length && (
          <EmptyState
            title="Nenhuma OS agendada"
            text="Assim que uma ordem for programada para atendimento, ela aparecerá aqui com data e horário."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}
