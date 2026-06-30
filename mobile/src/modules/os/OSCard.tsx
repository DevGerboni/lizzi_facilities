import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { dataHora, localOs, rotuloPrioridade, rotuloStatus } from '../../lib/formatters';
import { STATUS_COLOR } from '../../lib/os-rules';
import { styles } from '../../theme/styles';
import type { OSItem } from '../../types/mobile';

export function OSCard({ os, onPress, agenda = false }: { os: OSItem; onPress: () => void; agenda?: boolean }) {
  const cor = STATUS_COLOR[os.status] || '#64748b';
  const metaPrincipal = agenda ? dataHora(os.data_agendada, os.hora_agendada) : os.tecnico_nome || 'Sem técnico';

  return (
    <Pressable style={styles.osCard} onPress={onPress}>
      <View style={styles.osCardTop}>
        <Text style={styles.osCodigo}>{os.codigo}</Text>
        <Text style={[styles.statusBadge, { color: cor, borderColor: cor }]}>{rotuloStatus(os.status)}</Text>
      </View>
      <Text style={styles.osTipo}>
        {os.tipo_os} - {rotuloPrioridade(os.prioridade)}
      </Text>
      <Text style={styles.osLocal}>{localOs(os)}</Text>
      <View style={styles.osCardBottom}>
        <View style={styles.osCardMetaPill}>
          <Text style={styles.osCardMetaPillText}>{agenda ? 'Horário programado' : 'Responsável'}</Text>
        </View>
        <Text style={styles.osMeta}>{metaPrincipal}</Text>
      </View>
    </Pressable>
  );
}
