/** Arrival-route scenario choices shown before Begin Scenario. */

export const ARRIVAL_SCENARIOS = [
  {
    id: 'walkin',
    emj: '🚶',
    title: 'Walk-In',
    desc: 'Patient arrives at the ED on their own. Start → Patient present → ED Quick Reg.',
  },
  {
    id: 'paramedic',
    emj: '🚑',
    title: 'Paramedic Pre-Arrival',
    desc: 'Paramedics call ahead. Start → Paramedics called in → Pre-Arrival → Attach.',
  },
];

export const INTRO = {
  title: 'ED Registration Scenario',
  subtitle: 'IWK Emergency Department · Cerner / FirstNet registration path',
  body:
    'Walk the patient through the ED Registration flowchart. Choose an arrival route, answer checkpoint questions, and decide criticality at the diamond. Use Next / Back (or ← →) at your own pace — ideal for a facilitator-led 15-minute walkthrough.',
};
