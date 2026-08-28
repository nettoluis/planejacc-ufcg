// Offline snapshot used when the live criteria doc can't be reached, and
// the source of small cosmetic overlays (unidadeLabel, obs) the doc's
// prose doesn't cleanly separate out as structured data (see activities.js).
export const FALLBACK_ACTIVITIES = [
  {id:1, categoria:"extensao", desc:"Participação em programas ou projetos de extensão", tipoCalc:"custom", unidadeMinima:"A definir pelo Comitê", maxCreditos:22, doc:"Declaração emitida pela Pró-Reitoria competente."},
  {id:2, categoria:"extensao", desc:"Preparação e execução de cursos e oficinas de extensão", tipoCalc:"horas", creditosPor15h:1, maxCreditos:22, doc:"Declaração emitida pelo Comitê Interno de Extensão da UASC."},
  {id:3, categoria:"extensao", desc:"Organização de eventos de extensão", tipoCalc:"horas", creditosPor15h:1, maxCreditos:8, doc:"Declaração emitida pelo Comitê Interno de Extensão da UASC."},
  {id:4, categoria:"extensao", desc:"Participação em equipe de execução de serviços de assessoria técnica, P&D e inovação", tipoCalc:"horas", creditosPor15h:1, maxCreditos:22, doc:"Declaração emitida pelo Comitê Interno de Extensão da UASC."},
  {id:5, categoria:"extensao", desc:"Atividade de extensão executada no âmbito do PET", tipoCalc:"horas", creditosPor15h:1, maxCreditos:22, doc:"Declaração emitida pelo Comitê Interno de Extensão da UASC."},
  {id:6, categoria:"flexivel", desc:"Participação em pesquisa de iniciação científica (PIBIC, PIBITI, etc)", tipoCalc:"fixo", unidadeLabel:"projeto(s) de 1 ano concluído(s)", creditosPorUnidade:8, maxCreditos:8, doc:"Declaração emitida pela Pró-Reitoria competente."},
  {id:7, categoria:"flexivel", desc:"Participação em projeto de pesquisa e inovação (UFCG)", tipoCalc:"horas", creditosPor15h:1, maxCreditos:8, doc:"Declaração emitida pela Coordenação de Pesquisa e Extensão da UASC."},
  {id:8, categoria:"flexivel", desc:"Participação em monitoria reconhecida (UFCG)", tipoCalc:"fixo", unidadeLabel:"semestre(s) letivo(s)", creditosPorUnidade:4, maxCreditos:8, doc:"Declaração emitida pela Pró-Reitoria competente."},
  {id:9, categoria:"flexivel", desc:"Realização de estágio não obrigatório", tipoCalc:"horas", creditosPor15h:1, maxCreditos:8, minHoras:120, doc:"Termo de celebração do estágio.", obs:"Carga horária total mínima de 120h para pontuar."},
  {id:10, categoria:"flexivel", desc:"Atividades profissionais na área de Computação", tipoCalc:"horas", creditosPor15h:1, maxCreditos:8, minHoras:120, doc:"Declaração do empregador.", obs:"Válido apenas após 80 créditos obrigatórios. Min 120h."},
  {id:11, categoria:"flexivel", desc:"Representação estudantil (CA, Colegiado, DCE)", tipoCalc:"fixo", unidadeLabel:"ano(s) de mandato", creditosPorUnidade:2, maxCreditos:2, doc:"Ata de eleição ou portaria."},
  {id:12, categoria:"flexivel", desc:"Atividade flexível executada no âmbito do PET", tipoCalc:"horas", creditosPor15h:1, maxCreditos:8, doc:"Certificado do Tutor do PET."},
  {id:13, categoria:"outras", desc:"Outras atividades (definidas pelo Colegiado)", tipoCalc:"custom", maxCreditos:8, doc:"A definir pelo Colegiado.", obs:"Pode ser enquadrada como Extensão ou Flexível."}
];
