/** Checkpoint questions tied to workflow nodes. */

export const QUESTIONS = {
  quick_reg: {
    id: 'quick_reg',
    nodeId: 'quick_reg',
    title: 'ED Quick Reg',
    prompt: 'Who typically completes ED Quick Registration for a walk-in patient?',
    options: [
      { id: 'a', label: 'Paramedic in the ambulance' },
      { id: 'b', label: 'ED Nurse only' },
      { id: 'c', label: 'ED Nurse or Registration Clerk', correct: true },
      { id: 'd', label: 'Lab technologist' },
    ],
    explanation:
      'ED Quick Reg can be completed by an ED Nurse or a Registration Clerk so the patient is in the system quickly while clinical care can begin. Full registration is finished later by the Registration Clerk.',
    points: 10,
  },
  pre_arrival: {
    id: 'pre_arrival',
    nodeId: 'pre_arrival',
    title: 'Pre-Arrival form',
    prompt: 'Why does the ED Nurse complete a Pre-Arrival form when paramedics call ahead?',
    options: [
      { id: 'a', label: 'To bill the ambulance service immediately' },
      { id: 'b', label: 'To capture key patient details before the patient physically arrives', correct: true },
      { id: 'c', label: 'To skip triage entirely' },
      { id: 'd', label: 'To discharge the patient remotely' },
    ],
    explanation:
      'Pre-Arrival lets the ED prepare with demographics and clinical cues before the patient arrives. Later those details are attached to the live encounter.',
    points: 10,
  },
  attach_pre: {
    id: 'attach_pre',
    nodeId: 'attach_pre',
    title: 'Attach Pre-Arrival',
    prompt: 'When should Pre-Arrival information be attached?',
    options: [
      { id: 'a', label: 'Only after the patient is discharged' },
      { id: 'b', label: 'When the patient arrives and the encounter is ready to continue', correct: true },
      { id: 'c', label: 'Before paramedics leave their station' },
      { id: 'd', label: 'Never — Pre-Arrival replaces registration' },
    ],
    explanation:
      'Attach Pre-Arrival connects the call-ahead record to the patient who has now arrived, so the registration and clinical teams share one continuous story.',
    points: 10,
  },
  triage: {
    id: 'triage',
    nodeId: 'triage',
    title: 'ED Triage',
    prompt: 'What is the main purpose of ED Triage for a non-critical patient?',
    options: [
      { id: 'a', label: 'Assign acuity and determine next clinical priority', correct: true },
      { id: 'b', label: 'Collect payment and insurance only' },
      { id: 'c', label: 'Book an elective OR slot' },
      { id: 'd', label: 'Print the discharge summary' },
    ],
    explanation:
      'Triage assesses urgency. After triage, the patient may return to the criticality decision if things change, or move on toward complete registration.',
    points: 10,
  },
  complete: {
    id: 'complete',
    nodeId: 'complete',
    title: 'ED Complete Registration',
    prompt: 'Who completes full ED registration in this workflow?',
    options: [
      { id: 'a', label: 'ED Nurse' },
      { id: 'b', label: 'Registration Clerk', correct: true },
      { id: 'c', label: 'DI technologist' },
      { id: 'd', label: 'Housekeeping' },
    ],
    explanation:
      'The Registration Clerk finishes the full registration encounter — demographics, coverage, and encounter details — after clinical priority steps are underway.',
    points: 10,
  },
};

export function questionForNode(nodeId) {
  return Object.values(QUESTIONS).find(q => q.nodeId === nodeId) || null;
}
