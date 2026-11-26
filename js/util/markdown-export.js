// Builds a Markdown summary of the student's plan: every period that has
// at least one course placed in it, plus the trilhas covered by the
// courses in those periods. It always reflects the whole plan — the
// search/status/trilha filters on screen are deliberately ignored.

const isPlaced = (c) => typeof c.customSem === 'number';

// Pipes would break a Markdown table cell.
const cell = (value) => String(value ?? '').replace(/\|/g, '\\|');

const sumCredits = (list) => list.reduce((acc, c) => acc + (Number(c.cr) || 0), 0);

function formatDate(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function periodSection(sem, list) {
  const lines = [
    `### ${sem}º Período`,
    '',
    `${list.length} disciplina${list.length === 1 ? '' : 's'} · ${sumCredits(list)} créditos`,
    '',
    '| Código | Disciplina | Tipo | Créditos | Status | Trilhas |',
    '| --- | --- | --- | ---: | --- | --- |',
  ];
  list.forEach((c) => {
    const trilhas = (c.trilhas || []).join(', ') || '—';
    lines.push(
      `| ${cell(c.id)} | ${cell(c.name)} | ${cell(c.tipo)} | ${cell(c.cr)} | ${cell(c.status)} | ${cell(trilhas)} |`
    );
  });
  lines.push('');
  return lines;
}

function trilhasSection(placed) {
  const byTrilha = new Map();
  placed.forEach((c) => {
    (c.trilhas || []).forEach((t) => {
      if (!byTrilha.has(t)) byTrilha.set(t, []);
      byTrilha.get(t).push(c);
    });
  });

  const lines = ['## Trilhas abarcadas', ''];
  if (byTrilha.size === 0) {
    lines.push('_Nenhuma disciplina nos períodos pertence a uma trilha._', '');
    return lines;
  }

  [...byTrilha.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((trilha) => {
    const list = byTrilha.get(trilha).sort((a, b) => a.customSem - b.customSem);
    const done = list.filter((c) => c.status === 'Concluída').length;
    lines.push(
      `### ${trilha}`,
      '',
      `${list.length} disciplina${list.length === 1 ? '' : 's'} · ${sumCredits(list)} créditos · ${done} concluída${done === 1 ? '' : 's'}`,
      ''
    );
    list.forEach((c) => {
      const mark = c.status === 'Concluída' ? 'x' : ' ';
      lines.push(`- [${mark}] ${c.name} (${c.id}) — ${c.customSem}º período`);
    });
    lines.push('');
  });
  return lines;
}

export function buildPlanMarkdown(courses, stats, { now = new Date() } = {}) {
  const placed = courses.filter(isPlaced);
  const periods = [...new Set(placed.map((c) => c.customSem))].sort((a, b) => a - b);

  const lines = [
    '# Meu Currículo — Ciência da Computação UFCG',
    '',
    `_Gerado em ${formatDate(now)}_`,
    '',
    '## Resumo',
    '',
    `- **Créditos obrigatórios concluídos:** ${stats.obrigatorio} / 140`,
    `- **Créditos optativos concluídos:** ${stats.optativo} / 44`,
    `- **Períodos planejados:** ${periods.length}`,
    `- **Disciplinas nos períodos:** ${placed.length} (${sumCredits(placed)} créditos)`,
    '',
    '## Períodos',
    '',
  ];

  if (periods.length === 0) {
    lines.push('_Nenhuma disciplina foi alocada em um período._', '');
  } else {
    periods.forEach((sem) => {
      const list = placed.filter((c) => c.customSem === sem);
      lines.push(...periodSection(sem, list));
    });
  }

  lines.push(...trilhasSection(placed));

  return lines.join('\n');
}

export function downloadTextFile(filename, content, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can abort the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
